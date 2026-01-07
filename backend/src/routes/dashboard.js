const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        // Total clients
        const totalClients = await db.query(
            'SELECT COUNT(*) as count FROM clients WHERE status = \'active\''
        );
        
        // Total services
        const totalServices = await db.query(
            'SELECT COUNT(*) as count FROM client_services WHERE status = \'active\''
        );
        
        // Active RADIUS sessions
        const activeSessions = await db.query(
            'SELECT COUNT(*) as count FROM radacct WHERE acctstoptime IS NULL'
        );
        
        // Pending invoices
        const pendingInvoices = await db.query(
            'SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM invoices WHERE status = \'pending\''
        );
        
        // Recent clients
        const recentClients = await db.query(
            'SELECT * FROM clients ORDER BY created_at DESC LIMIT 5'
        );
        
        // Services expiring soon (within 7 days)
        const expiringServices = await db.query(
            `SELECT cs.*, c.company_name, c.client_code
             FROM client_services cs
             LEFT JOIN clients c ON cs.client_id = c.id
             WHERE cs.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
             ORDER BY cs.expiration_date
             LIMIT 10`
        );
        
        res.json({
            totalClients: parseInt(totalClients.rows[0].count),
            totalServices: parseInt(totalServices.rows[0].count),
            activeSessions: parseInt(activeSessions.rows[0].count),
            pendingInvoices: {
                count: parseInt(pendingInvoices.rows[0].count),
                total: parseFloat(pendingInvoices.rows[0].total)
            },
            recentClients: recentClients.rows,
            expiringServices: expiringServices.rows
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: { message: 'Failed to get dashboard statistics' } });
    }
});

module.exports = router;
