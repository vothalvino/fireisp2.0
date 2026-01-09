const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get all tickets with pagination and filters
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status || '';
        const priority = req.query.priority || '';
        const type = req.query.type || '';
        const clientId = req.query.clientId || '';
        const assignedTo = req.query.assignedTo || '';
        
        let query = `
            SELECT t.*, 
                   c.company_name, c.client_code,
                   u.username as assigned_username,
                   uc.username as created_by_username
            FROM tickets t
            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN users u ON t.assigned_to = u.id
            LEFT JOIN users uc ON t.created_by = uc.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (status) {
            query += ` AND t.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        
        if (priority) {
            query += ` AND t.priority = $${paramIndex}`;
            params.push(priority);
            paramIndex++;
        }
        
        if (type) {
            query += ` AND t.type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }
        
        if (clientId) {
            query += ` AND t.client_id = $${paramIndex}`;
            params.push(clientId);
            paramIndex++;
        }
        
        if (assignedTo) {
            query += ` AND t.assigned_to = $${paramIndex}`;
            params.push(assignedTo);
            paramIndex++;
        }
        
        query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        const result = await db.query(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM tickets WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;
        
        if (status) {
            countQuery += ` AND status = $${countParamIndex}`;
            countParams.push(status);
            countParamIndex++;
        }
        
        if (priority) {
            countQuery += ` AND priority = $${countParamIndex}`;
            countParams.push(priority);
            countParamIndex++;
        }
        
        if (type) {
            countQuery += ` AND type = $${countParamIndex}`;
            countParams.push(type);
            countParamIndex++;
        }
        
        if (clientId) {
            countQuery += ` AND client_id = $${countParamIndex}`;
            countParams.push(clientId);
            countParamIndex++;
        }
        
        if (assignedTo) {
            countQuery += ` AND assigned_to = $${countParamIndex}`;
            countParams.push(assignedTo);
        }
        
        const countResult = await db.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);
        
        res.json({
            tickets: result.rows,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ error: { message: 'Failed to get tickets' } });
    }
});

// Get ticket statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'open') as open_count,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
                COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
                COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
                COUNT(*) FILTER (WHERE priority = 'high') as high_count,
                COUNT(*) FILTER (WHERE client_id IS NULL) as independent_count,
                COUNT(*) FILTER (WHERE client_id IS NOT NULL) as client_count
            FROM tickets
        `);
        
        res.json(stats.rows[0]);
    } catch (error) {
        console.error('Get ticket stats error:', error);
        res.status(500).json({ error: { message: 'Failed to get ticket statistics' } });
    }
});

// Get single ticket with comments
router.get('/:id', async (req, res) => {
    try {
        const ticketResult = await db.query(
            `SELECT t.*, 
                    c.company_name, c.client_code, c.email, c.phone,
                    u.username as assigned_username, u.full_name as assigned_full_name,
                    uc.username as created_by_username, uc.full_name as created_by_full_name
             FROM tickets t
             LEFT JOIN clients c ON t.client_id = c.id
             LEFT JOIN users u ON t.assigned_to = u.id
             LEFT JOIN users uc ON t.created_by = uc.id
             WHERE t.id = $1`,
            [req.params.id]
        );
        
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Ticket not found' } });
        }
        
        const commentsResult = await db.query(
            `SELECT tc.*, u.username, u.full_name
             FROM ticket_comments tc
             LEFT JOIN users u ON tc.user_id = u.id
             WHERE tc.ticket_id = $1
             ORDER BY tc.created_at ASC`,
            [req.params.id]
        );
        
        const ticket = {
            ...ticketResult.rows[0],
            comments: commentsResult.rows
        };
        
        res.json(ticket);
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ error: { message: 'Failed to get ticket' } });
    }
});

// Create new ticket
router.post('/', async (req, res) => {
    try {
        const {
            clientId,
            title,
            description,
            type,
            priority,
            assignedTo
        } = req.body;
        
        // Validate required fields
        if (!title) {
            return res.status(400).json({ error: { message: 'Title is required' } });
        }
        
        // Generate ticket number
        const countResult = await db.query('SELECT COUNT(*) FROM tickets');
        const count = parseInt(countResult.rows[0].count);
        const ticketNumber = `TK${String(count + 1).padStart(6, '0')}`;
        
        const result = await db.query(
            `INSERT INTO tickets 
             (ticket_number, client_id, title, description, type, priority, status, assigned_to, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                ticketNumber,
                clientId || null,
                title,
                description || '',
                type || 'support',
                priority || 'medium',
                'open',
                assignedTo || null,
                req.user.id
            ]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ error: { message: 'Failed to create ticket' } });
    }
});

// Update ticket
router.put('/:id', async (req, res) => {
    try {
        const {
            clientId,
            title,
            description,
            type,
            priority,
            status,
            assignedTo
        } = req.body;
        
        // Build update query dynamically
        const updates = [];
        const params = [];
        let paramIndex = 1;
        
        if (clientId !== undefined) {
            updates.push(`client_id = $${paramIndex}`);
            params.push(clientId || null);
            paramIndex++;
        }
        
        if (title !== undefined) {
            updates.push(`title = $${paramIndex}`);
            params.push(title);
            paramIndex++;
        }
        
        if (description !== undefined) {
            updates.push(`description = $${paramIndex}`);
            params.push(description);
            paramIndex++;
        }
        
        if (type !== undefined) {
            updates.push(`type = $${paramIndex}`);
            params.push(type);
            paramIndex++;
        }
        
        if (priority !== undefined) {
            updates.push(`priority = $${paramIndex}`);
            params.push(priority);
            paramIndex++;
        }
        
        if (status !== undefined) {
            updates.push(`status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
            
            // Set resolved_at or closed_at timestamps
            if (status === 'resolved') {
                updates.push(`resolved_at = CURRENT_TIMESTAMP`);
            } else if (status === 'closed') {
                updates.push(`closed_at = CURRENT_TIMESTAMP`);
            }
        }
        
        if (assignedTo !== undefined) {
            updates.push(`assigned_to = $${paramIndex}`);
            params.push(assignedTo || null);
            paramIndex++;
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: { message: 'No fields to update' } });
        }
        
        params.push(req.params.id);
        const query = `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        
        const result = await db.query(query, params);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Ticket not found' } });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({ error: { message: 'Failed to update ticket' } });
    }
});

// Delete ticket
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM tickets WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Ticket not found' } });
        }
        
        res.json({ message: 'Ticket deleted successfully' });
    } catch (error) {
        console.error('Delete ticket error:', error);
        res.status(500).json({ error: { message: 'Failed to delete ticket' } });
    }
});

// Add comment to ticket
router.post('/:id/comments', async (req, res) => {
    try {
        const { comment, isInternal } = req.body;
        
        if (!comment) {
            return res.status(400).json({ error: { message: 'Comment is required' } });
        }
        
        // Check if ticket exists
        const ticketCheck = await db.query('SELECT id FROM tickets WHERE id = $1', [req.params.id]);
        if (ticketCheck.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Ticket not found' } });
        }
        
        const result = await db.query(
            `INSERT INTO ticket_comments (ticket_id, user_id, comment, is_internal)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [req.params.id, req.user.id, comment, isInternal || false]
        );
        
        // Get comment with user info
        const commentResult = await db.query(
            `SELECT tc.*, u.username, u.full_name
             FROM ticket_comments tc
             LEFT JOIN users u ON tc.user_id = u.id
             WHERE tc.id = $1`,
            [result.rows[0].id]
        );
        
        res.status(201).json(commentResult.rows[0]);
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: { message: 'Failed to add comment' } });
    }
});

module.exports = router;
