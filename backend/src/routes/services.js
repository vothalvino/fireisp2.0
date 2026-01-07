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
            activationDate, expirationDate, notes
        } = req.body;
        
        const result = await db.query(
            `INSERT INTO client_services (
                client_id, service_plan_id, username, password, ip_address, mac_address,
                activation_date, expiration_date, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [clientId, servicePlanId, username, password, ipAddress, macAddress,
             activationDate, expirationDate, notes]
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
            status, activationDate, expirationDate, notes
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
                mac_address = $5, status = $6, activation_date = $7, expiration_date = $8, notes = $9
            WHERE id = $10
            RETURNING *`,
            [servicePlanId, username, password, ipAddress, macAddress,
             status, activationDate, expirationDate, notes, req.params.id]
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

module.exports = router;
