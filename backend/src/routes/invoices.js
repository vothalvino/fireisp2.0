const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get all invoices with pagination and filters
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status || '';
        const clientId = req.query.clientId || '';
        
        let query = `
            SELECT i.*, c.company_name, c.client_code
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (status) {
            query += ` AND i.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        
        if (clientId) {
            query += ` AND i.client_id = $${paramIndex}`;
            params.push(clientId);
            paramIndex++;
        }
        
        query += ` ORDER BY i.issue_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        const result = await db.query(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM invoices WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;
        
        if (status) {
            countQuery += ` AND status = $${countParamIndex}`;
            countParams.push(status);
            countParamIndex++;
        }
        
        if (clientId) {
            countQuery += ` AND client_id = $${countParamIndex}`;
            countParams.push(clientId);
        }
        
        const countResult = await db.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);
        
        res.json({
            invoices: result.rows,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({ error: { message: 'Failed to get invoices' } });
    }
});

// Get single invoice with items
router.get('/:id', async (req, res) => {
    try {
        const invoiceResult = await db.query(
            `SELECT i.*, c.company_name, c.client_code, c.email, c.address, c.city, c.state
             FROM invoices i
             LEFT JOIN clients c ON i.client_id = c.id
             WHERE i.id = $1`,
            [req.params.id]
        );
        
        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Invoice not found' } });
        }
        
        const itemsResult = await db.query(
            `SELECT ii.*, cs.username as service_username
             FROM invoice_items ii
             LEFT JOIN client_services cs ON ii.client_service_id = cs.id
             WHERE ii.invoice_id = $1`,
            [req.params.id]
        );
        
        const invoice = {
            ...invoiceResult.rows[0],
            items: itemsResult.rows
        };
        
        res.json(invoice);
    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({ error: { message: 'Failed to get invoice' } });
    }
});

// Create new invoice
router.post('/', async (req, res) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        
        const {
            invoiceNumber, clientId, issueDate, dueDate,
            subtotal, tax, total, notes, items
        } = req.body;
        
        // Create invoice
        const invoiceResult = await client.query(
            `INSERT INTO invoices (
                invoice_number, client_id, issue_date, due_date,
                subtotal, tax, total, notes, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
            RETURNING *`,
            [invoiceNumber, clientId, issueDate, dueDate, subtotal, tax, total, notes]
        );
        
        const invoiceId = invoiceResult.rows[0].id;
        
        // Create invoice items
        if (items && items.length > 0) {
            for (const item of items) {
                await client.query(
                    `INSERT INTO invoice_items (
                        invoice_id, client_service_id, description,
                        quantity, unit_price, total
                    ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [invoiceId, item.clientServiceId, item.description,
                     item.quantity, item.unitPrice, item.total]
                );
            }
        }
        
        await client.query('COMMIT');
        
        res.status(201).json(invoiceResult.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create invoice error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: { message: 'Invoice number already exists' } });
        }
        res.status(500).json({ error: { message: 'Failed to create invoice' } });
    } finally {
        client.release();
    }
});

// Update invoice
router.put('/:id', async (req, res) => {
    try {
        const {
            invoiceNumber, issueDate, dueDate,
            subtotal, tax, total, status, notes
        } = req.body;
        
        const result = await db.query(
            `UPDATE invoices SET
                invoice_number = $1, issue_date = $2, due_date = $3,
                subtotal = $4, tax = $5, total = $6, status = $7, notes = $8
            WHERE id = $9
            RETURNING *`,
            [invoiceNumber, issueDate, dueDate, subtotal, tax, total, status, notes, req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Invoice not found' } });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update invoice error:', error);
        res.status(500).json({ error: { message: 'Failed to update invoice' } });
    }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM invoices WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Invoice not found' } });
        }
        
        res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('Delete invoice error:', error);
        res.status(500).json({ error: { message: 'Failed to delete invoice' } });
    }
});

// Add invoice item
router.post('/:id/items', async (req, res) => {
    try {
        const { clientServiceId, description, quantity, unitPrice, total } = req.body;
        
        const result = await db.query(
            `INSERT INTO invoice_items (
                invoice_id, client_service_id, description, quantity, unit_price, total
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [req.params.id, clientServiceId, description, quantity, unitPrice, total]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Add invoice item error:', error);
        res.status(500).json({ error: { message: 'Failed to add invoice item' } });
    }
});

// Delete invoice item
router.delete('/:id/items/:itemId', async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM invoice_items WHERE id = $1 AND invoice_id = $2 RETURNING id',
            [req.params.itemId, req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Invoice item not found' } });
        }
        
        res.json({ message: 'Invoice item deleted successfully' });
    } catch (error) {
        console.error('Delete invoice item error:', error);
        res.status(500).json({ error: { message: 'Failed to delete invoice item' } });
    }
});

// Record payment
router.post('/:id/payments', async (req, res) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        
        const { amount, paymentDate, paymentMethod, transactionId, notes } = req.body;
        
        // Record payment
        const paymentResult = await client.query(
            `INSERT INTO payments (
                invoice_id, amount, payment_date, payment_method, transaction_id, notes
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [req.params.id, amount, paymentDate, paymentMethod, transactionId, notes]
        );
        
        // Check if invoice is fully paid
        const paymentsSum = await client.query(
            'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = $1',
            [req.params.id]
        );
        
        const invoiceTotal = await client.query(
            'SELECT total FROM invoices WHERE id = $1',
            [req.params.id]
        );
        
        const totalPaid = parseFloat(paymentsSum.rows[0].total);
        const invoiceAmount = parseFloat(invoiceTotal.rows[0].total);
        
        if (totalPaid >= invoiceAmount) {
            await client.query(
                "UPDATE invoices SET status = 'paid' WHERE id = $1",
                [req.params.id]
            );
        }
        
        await client.query('COMMIT');
        
        res.status(201).json(paymentResult.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Record payment error:', error);
        res.status(500).json({ error: { message: 'Failed to record payment' } });
    } finally {
        client.release();
    }
});

// Get invoice payments
router.get('/:id/payments', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC',
            [req.params.id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: { message: 'Failed to get payments' } });
    }
});

module.exports = router;
