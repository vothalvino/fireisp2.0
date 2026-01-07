const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get all clients with pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || '';
        
        let query = `
            SELECT c.*, u.username as created_by_name,
                   COUNT(cs.id) as service_count
            FROM clients c
            LEFT JOIN users u ON c.created_by = u.id
            LEFT JOIN client_services cs ON c.id = cs.client_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (search) {
            query += ` AND (c.client_code ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex} 
                       OR c.contact_person ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        if (status) {
            query += ` AND c.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        
        query += ` GROUP BY c.id, u.username ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        const result = await db.query(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM clients WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;
        
        if (search) {
            countQuery += ` AND (client_code ILIKE $${countParamIndex} OR company_name ILIKE $${countParamIndex} 
                           OR contact_person ILIKE $${countParamIndex} OR email ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
            countParamIndex++;
        }
        
        if (status) {
            countQuery += ` AND status = $${countParamIndex}`;
            countParams.push(status);
        }
        
        const countResult = await db.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);
        
        res.json({
            clients: result.rows,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Get clients error:', error);
        res.status(500).json({ error: { message: 'Failed to get clients' } });
    }
});

// Get single client
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.*, u.username as created_by_name
             FROM clients c
             LEFT JOIN users u ON c.created_by = u.id
             WHERE c.id = $1`,
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Client not found' } });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get client error:', error);
        res.status(500).json({ error: { message: 'Failed to get client' } });
    }
});

// Create client
router.post('/', async (req, res) => {
    try {
        const {
            clientCode, companyName, contactPerson, email, phone, mobile,
            address, city, state, postalCode, country, taxId, notes
        } = req.body;
        
        const result = await db.query(
            `INSERT INTO clients (
                client_code, company_name, contact_person, email, phone, mobile,
                address, city, state, postal_code, country, tax_id, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *`,
            [clientCode, companyName, contactPerson, email, phone, mobile,
             address, city, state, postalCode, country, taxId, notes, req.user.id]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create client error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: { message: 'Client code already exists' } });
        }
        res.status(500).json({ error: { message: 'Failed to create client' } });
    }
});

// Update client
router.put('/:id', async (req, res) => {
    try {
        const {
            clientCode, companyName, contactPerson, email, phone, mobile,
            address, city, state, postalCode, country, taxId, status, notes
        } = req.body;
        
        const result = await db.query(
            `UPDATE clients SET
                client_code = $1, company_name = $2, contact_person = $3, email = $4,
                phone = $5, mobile = $6, address = $7, city = $8, state = $9,
                postal_code = $10, country = $11, tax_id = $12, status = $13, notes = $14
            WHERE id = $15
            RETURNING *`,
            [clientCode, companyName, contactPerson, email, phone, mobile,
             address, city, state, postalCode, country, taxId, status, notes, req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Client not found' } });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update client error:', error);
        res.status(500).json({ error: { message: 'Failed to update client' } });
    }
});

// Delete client
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM clients WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Client not found' } });
        }
        
        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Delete client error:', error);
        res.status(500).json({ error: { message: 'Failed to delete client' } });
    }
});

// Get client services
router.get('/:id/services', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT cs.*, sp.name as plan_name, st.name as service_type
             FROM client_services cs
             LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
             LEFT JOIN service_types st ON sp.service_type_id = st.id
             WHERE cs.client_id = $1
             ORDER BY cs.created_at DESC`,
            [req.params.id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get client services error:', error);
        res.status(500).json({ error: { message: 'Failed to get client services' } });
    }
});

module.exports = router;
