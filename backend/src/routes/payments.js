const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get client's unpaid invoices
router.get('/client/:clientId/unpaid-invoices', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT i.*, 
                    (i.total - COALESCE(i.amount_paid, 0)) as amount_due
             FROM invoices i
             WHERE i.client_id = $1 
             AND i.status != 'paid' 
             AND i.status != 'cancelled'
             AND (i.total - COALESCE(i.amount_paid, 0)) > 0
             ORDER BY i.due_date ASC`,
            [req.params.clientId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get unpaid invoices error:', error);
        res.status(500).json({ error: { message: 'Failed to get unpaid invoices' } });
    }
});

// Get client credit balance
router.get('/client/:clientId/credit', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT credit_balance FROM clients WHERE id = $1',
            [req.params.clientId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Client not found' } });
        }
        
        res.json({ 
            clientId: req.params.clientId,
            creditBalance: parseFloat(result.rows[0].credit_balance || 0)
        });
    } catch (error) {
        console.error('Get client credit error:', error);
        res.status(500).json({ error: { message: 'Failed to get client credit' } });
    }
});

// Register a new payment (with or without invoice allocation)
router.post('/', async (req, res) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        
        const {
            clientId,
            amount,
            paymentDate,
            paymentMethod,
            transactionId,
            notes,
            invoiceAllocations // Array of { invoiceId, amount }
        } = req.body;
        
        // Validate required fields
        if (!clientId || !amount || !paymentDate || !paymentMethod) {
            return res.status(400).json({ 
                error: { message: 'Client ID, amount, payment date, and payment method are required' } 
            });
        }
        
        if (amount <= 0) {
            return res.status(400).json({ 
                error: { message: 'Payment amount must be greater than zero' } 
            });
        }
        
        // Create the main payment record
        const paymentResult = await client.query(
            `INSERT INTO payments (
                client_id, amount, payment_date, payment_method, transaction_id, notes
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [clientId, amount, paymentDate, paymentMethod, transactionId, notes]
        );
        
        const paymentId = paymentResult.rows[0].id;
        let totalAllocated = 0;
        
        // If there are invoice allocations, create them
        if (invoiceAllocations && invoiceAllocations.length > 0) {
            for (const allocation of invoiceAllocations) {
                if (allocation.amount <= 0) {
                    continue;
                }
                
                // Verify the invoice exists and belongs to the client
                const invoiceCheck = await client.query(
                    `SELECT i.*, (i.total - COALESCE(i.amount_paid, 0)) as amount_due
                     FROM invoices i
                     WHERE i.id = $1 AND i.client_id = $2`,
                    [allocation.invoiceId, clientId]
                );
                
                if (invoiceCheck.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ 
                        error: { message: `Invoice ${allocation.invoiceId} not found or does not belong to client` } 
                    });
                }
                
                const invoice = invoiceCheck.rows[0];
                const amountDue = parseFloat(invoice.amount_due);
                
                // Ensure we don't allocate more than what's due
                const allocationAmount = Math.min(parseFloat(allocation.amount), amountDue);
                
                if (allocationAmount > 0) {
                    // Create payment allocation
                    await client.query(
                        `INSERT INTO payment_allocations (payment_id, invoice_id, amount)
                         VALUES ($1, $2, $3)`,
                        [paymentId, allocation.invoiceId, allocationAmount]
                    );
                    
                    totalAllocated += allocationAmount;
                }
            }
        }
        
        // Calculate remaining amount (to be added as credit)
        const remainingAmount = parseFloat(amount) - totalAllocated;
        
        // If there's remaining amount, add it to client credit
        if (remainingAmount > 0) {
            await client.query(
                `UPDATE clients 
                 SET credit_balance = COALESCE(credit_balance, 0) + $1
                 WHERE id = $2`,
                [remainingAmount, clientId]
            );
        }
        
        await client.query('COMMIT');
        
        // Get updated client credit
        const creditResult = await db.query(
            'SELECT credit_balance FROM clients WHERE id = $1',
            [clientId]
        );
        
        res.status(201).json({
            payment: paymentResult.rows[0],
            totalAllocated,
            creditAdded: remainingAmount,
            currentCredit: parseFloat(creditResult.rows[0].credit_balance || 0)
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Register payment error:', error);
        res.status(500).json({ error: { message: 'Failed to register payment' } });
    } finally {
        client.release();
    }
});

// Get payment history for a client
router.get('/client/:clientId/history', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        const result = await db.query(
            `SELECT p.*,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'invoiceId', pa.invoice_id,
                                'invoiceNumber', i.invoice_number,
                                'amount', pa.amount
                            )
                        ) FILTER (WHERE pa.id IS NOT NULL),
                        '[]'
                    ) as allocations
             FROM payments p
             LEFT JOIN payment_allocations pa ON p.id = pa.payment_id
             LEFT JOIN invoices i ON pa.invoice_id = i.id
             WHERE p.client_id = $1
             GROUP BY p.id
             ORDER BY p.payment_date DESC, p.created_at DESC
             LIMIT $2 OFFSET $3`,
            [req.params.clientId, limit, offset]
        );
        
        // Get total count
        const countResult = await db.query(
            'SELECT COUNT(*) FROM payments WHERE client_id = $1',
            [req.params.clientId]
        );
        const totalCount = parseInt(countResult.rows[0].count);
        
        res.json({
            payments: result.rows,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ error: { message: 'Failed to get payment history' } });
    }
});

// Get single payment details
router.get('/:id', async (req, res) => {
    try {
        const paymentResult = await db.query(
            `SELECT p.*, c.company_name, c.client_code
             FROM payments p
             LEFT JOIN clients c ON p.client_id = c.id
             WHERE p.id = $1`,
            [req.params.id]
        );
        
        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Payment not found' } });
        }
        
        // Get allocations
        const allocationsResult = await db.query(
            `SELECT pa.*, i.invoice_number, i.total as invoice_total
             FROM payment_allocations pa
             LEFT JOIN invoices i ON pa.invoice_id = i.id
             WHERE pa.payment_id = $1`,
            [req.params.id]
        );
        
        const payment = {
            ...paymentResult.rows[0],
            allocations: allocationsResult.rows
        };
        
        res.json(payment);
    } catch (error) {
        console.error('Get payment error:', error);
        res.status(500).json({ error: { message: 'Failed to get payment' } });
    }
});

// Get all payments with pagination and filters
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const clientId = req.query.clientId || '';
        
        let query = `
            SELECT p.*, c.company_name, c.client_code
            FROM payments p
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (clientId) {
            query += ` AND p.client_id = $${paramIndex}`;
            params.push(clientId);
            paramIndex++;
        }
        
        query += ` ORDER BY p.payment_date DESC, p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        const result = await db.query(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM payments WHERE 1=1';
        const countParams = [];
        
        if (clientId) {
            countQuery += ' AND client_id = $1';
            countParams.push(clientId);
        }
        
        const countResult = await db.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);
        
        res.json({
            payments: result.rows,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: { message: 'Failed to get payments' } });
    }
});

module.exports = router;
