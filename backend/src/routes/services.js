const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get service types
router.get('/types', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM service_types WHERE is_active = true ORDER BY name'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get service types error:', error);
        res.status(500).json({ error: { message: 'Failed to get service types' } });
    }
});

// Get service plans
router.get('/plans', async (req, res) => {
    try {
        const serviceTypeId = req.query.serviceTypeId;
        
        let query = `
            SELECT sp.*, st.name as service_type_name
            FROM service_plans sp
            LEFT JOIN service_types st ON sp.service_type_id = st.id
            WHERE sp.is_active = true
        `;
        const params = [];
        
        if (serviceTypeId) {
            query += ' AND sp.service_type_id = $1';
            params.push(serviceTypeId);
        }
        
        query += ' ORDER BY sp.name';
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get service plans error:', error);
        res.status(500).json({ error: { message: 'Failed to get service plans' } });
    }
});

// Create service plan
router.post('/plans', async (req, res) => {
    try {
        const {
            serviceTypeId, name, description, downloadSpeed, uploadSpeed,
            price, billingCycle
        } = req.body;
        
        const result = await db.query(
            `INSERT INTO service_plans (
                service_type_id, name, description, download_speed, upload_speed,
                price, billing_cycle
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [serviceTypeId, name, description, downloadSpeed, uploadSpeed, price, billingCycle]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create service plan error:', error);
        res.status(500).json({ error: { message: 'Failed to create service plan' } });
    }
});

// Get all client services
router.get('/client-services', async (req, res) => {
    try {
        const status = req.query.status || '';
        
        let query = `
            SELECT cs.*, 
                   c.company_name, c.client_code,
                   sp.name as plan_name, st.name as service_type
            FROM client_services cs
            LEFT JOIN clients c ON cs.client_id = c.id
            LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
            LEFT JOIN service_types st ON sp.service_type_id = st.id
            WHERE 1=1
        `;
        const params = [];
        
        if (status) {
            query += ' AND cs.status = $1';
            params.push(status);
        }
        
        query += ' ORDER BY cs.created_at DESC';
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get client services error:', error);
        res.status(500).json({ error: { message: 'Failed to get client services' } });
    }
});

// Create client service
router.post('/client-services', async (req, res) => {
    try {
        const {
            clientId, servicePlanId, username, password, ipAddress, macAddress,
            activationDate, expirationDate, notes, billingDayOfMonth, daysUntilDue, 
            recurringBillingEnabled
        } = req.body;
        
        const result = await db.query(
            `INSERT INTO client_services (
                client_id, service_plan_id, username, password, ip_address, mac_address,
                activation_date, expiration_date, notes, billing_day_of_month, 
                days_until_due, recurring_billing_enabled
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [clientId, servicePlanId, username, password, ipAddress, macAddress,
             activationDate, expirationDate, notes, billingDayOfMonth || null, 
             daysUntilDue || null, recurringBillingEnabled !== false]
        );
        
        // Add to RADIUS tables
        await db.query(
            "INSERT INTO radcheck (username, attribute, op, value) VALUES ($1, 'Cleartext-Password', ':=', $2)",
            [username, password]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create client service error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: { message: 'Username already exists' } });
        }
        res.status(500).json({ error: { message: 'Failed to create client service' } });
    }
});

// Update client service
router.put('/client-services/:id', async (req, res) => {
    try {
        const {
            servicePlanId, username, password, ipAddress, macAddress,
            status, activationDate, expirationDate, notes, billingDayOfMonth,
            daysUntilDue, recurringBillingEnabled
        } = req.body;
        
        // Get old username
        const oldService = await db.query(
            'SELECT username FROM client_services WHERE id = $1',
            [req.params.id]
        );
        
        if (oldService.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Service not found' } });
        }
        
        const oldUsername = oldService.rows[0].username;
        
        // Update service
        const result = await db.query(
            `UPDATE client_services SET
                service_plan_id = $1, username = $2, password = $3, ip_address = $4,
                mac_address = $5, status = $6, activation_date = $7, expiration_date = $8, 
                notes = $9, billing_day_of_month = $10, days_until_due = $11, 
                recurring_billing_enabled = $12
            WHERE id = $13
            RETURNING *`,
            [servicePlanId, username, password, ipAddress, macAddress,
             status, activationDate, expirationDate, notes, billingDayOfMonth || null,
             daysUntilDue || null, recurringBillingEnabled !== false, req.params.id]
        );
        
        // Update RADIUS tables if username or password changed
        if (oldUsername !== username) {
            await db.query('DELETE FROM radcheck WHERE username = $1', [oldUsername]);
            await db.query('DELETE FROM radreply WHERE username = $1', [oldUsername]);
        }
        
        await db.query(
            `INSERT INTO radcheck (username, attribute, op, value)
             VALUES ($1, 'Cleartext-Password', ':=', $2)
             ON CONFLICT DO NOTHING`,
            [username, password]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update client service error:', error);
        res.status(500).json({ error: { message: 'Failed to update client service' } });
    }
});

// Delete client service
router.delete('/client-services/:id', async (req, res) => {
    try {
        // Get username before deleting
        const service = await db.query(
            'SELECT username FROM client_services WHERE id = $1',
            [req.params.id]
        );
        
        if (service.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Service not found' } });
        }
        
        const username = service.rows[0].username;
        
        // Delete from client_services
        await db.query('DELETE FROM client_services WHERE id = $1', [req.params.id]);
        
        // Delete from RADIUS tables
        await db.query('DELETE FROM radcheck WHERE username = $1', [username]);
        await db.query('DELETE FROM radreply WHERE username = $1', [username]);
        
        res.json({ message: 'Service deleted successfully' });
    } catch (error) {
        console.error('Delete client service error:', error);
        res.status(500).json({ error: { message: 'Failed to delete client service' } });
    }
});

// Generate recurring invoices for all active services
router.post('/generate-recurring-invoices', async (req, res) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        
        const today = new Date();
        const currentDay = today.getDate();
        
        // Get default billing settings
        const defaultSettings = await client.query(
            `SELECT key, value FROM system_settings 
             WHERE key IN ('default_billing_day', 'default_days_to_pay')`
        );
        
        const settingsMap = {};
        defaultSettings.rows.forEach(row => {
            settingsMap[row.key] = row.value;
        });
        
        const defaultBillingDay = parseInt(settingsMap.default_billing_day) || 1;
        const defaultDaysToPay = parseInt(settingsMap.default_days_to_pay) || 15;
        
        // Get all active services that need invoicing
        // A service needs invoicing if:
        // 1. It's active and has recurring billing enabled
        // 2. Either it's the billing day OR it has never been invoiced
        const servicesToInvoice = await client.query(
            `SELECT cs.*, sp.price, sp.billing_cycle, sp.name as plan_name,
                    c.id as client_id, c.company_name, c.email,
                    COALESCE(cs.billing_day_of_month, $1) as effective_billing_day,
                    COALESCE(cs.days_until_due, $2) as effective_days_until_due
             FROM client_services cs
             JOIN service_plans sp ON cs.service_plan_id = sp.id
             JOIN clients c ON cs.client_id = c.id
             WHERE cs.status = 'active' 
             AND cs.recurring_billing_enabled = true
             AND (
                 COALESCE(cs.billing_day_of_month, $1) = $3
                 OR cs.last_invoice_date IS NULL
                 OR (
                     EXTRACT(MONTH FROM cs.last_invoice_date) != EXTRACT(MONTH FROM CURRENT_DATE)
                     OR EXTRACT(YEAR FROM cs.last_invoice_date) != EXTRACT(YEAR FROM CURRENT_DATE)
                 )
             )`,
            [defaultBillingDay, defaultDaysToPay, currentDay]
        );
        
        const invoicesCreated = [];
        
        for (const service of servicesToInvoice.rows) {
            // Skip if already invoiced this month
            if (service.last_invoice_date) {
                const lastInvoiceDate = new Date(service.last_invoice_date);
                if (lastInvoiceDate.getMonth() === today.getMonth() && 
                    lastInvoiceDate.getFullYear() === today.getFullYear()) {
                    continue;
                }
            }
            
            const issueDate = today.toISOString().split('T')[0];
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() + service.effective_days_until_due);
            const dueDateStr = dueDate.toISOString().split('T')[0];
            
            // Generate invoice number
            const invoiceNumberResult = await client.query(
                `SELECT COUNT(*) as count FROM invoices 
                 WHERE EXTRACT(YEAR FROM issue_date) = EXTRACT(YEAR FROM CURRENT_DATE)`
            );
            const yearlyCount = parseInt(invoiceNumberResult.rows[0].count) + 1;
            const invoiceNumber = `INV-${today.getFullYear()}-${String(yearlyCount).padStart(5, '0')}`;
            
            const subtotal = parseFloat(service.price);
            const tax = subtotal * 0; // No tax for now, can be configured later
            const total = subtotal + tax;
            
            const description = `${service.plan_name} - ${service.billing_cycle} billing`;
            
            // Create invoice
            const invoiceResult = await client.query(
                `INSERT INTO invoices (
                    invoice_number, client_id, issue_date, due_date,
                    subtotal, tax, total, notes, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
                RETURNING *`,
                [invoiceNumber, service.client_id, issueDate, dueDateStr, 
                 subtotal, tax, total, `Recurring invoice for ${service.username}`]
            );
            
            const invoiceId = invoiceResult.rows[0].id;
            
            // Create invoice item
            await client.query(
                `INSERT INTO invoice_items (
                    invoice_id, client_service_id, description,
                    quantity, unit_price, total
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [invoiceId, service.id, description, 1, subtotal, subtotal]
            );
            
            // Update last_invoice_date for this service
            await client.query(
                `UPDATE client_services SET last_invoice_date = $1 WHERE id = $2`,
                [issueDate, service.id]
            );
            
            invoicesCreated.push({
                invoiceNumber,
                clientName: service.company_name,
                serviceName: service.plan_name,
                amount: total
            });
        }
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: `Generated ${invoicesCreated.length} recurring invoice(s)`,
            invoices: invoicesCreated
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Generate recurring invoices error:', error);
        res.status(500).json({ error: { message: 'Failed to generate recurring invoices' } });
    } finally {
        client.release();
    }
});

module.exports = router;
