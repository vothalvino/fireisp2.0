const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get NAS devices (Mikrotik routers)
router.get('/nas', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM nas ORDER BY nasname'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get NAS error:', error);
        res.status(500).json({ error: { message: 'Failed to get NAS devices' } });
    }
});

// Add NAS device
router.post('/nas', async (req, res) => {
    try {
        const { nasname, shortname, type, secret, description } = req.body;
        
        const result = await db.query(
            `INSERT INTO nas (nasname, shortname, type, secret, description)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [nasname, shortname, type || 'mikrotik', secret, description]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Add NAS error:', error);
        res.status(500).json({ error: { message: 'Failed to add NAS device' } });
    }
});

// Update NAS device
router.put('/nas/:id', async (req, res) => {
    try {
        const { nasname, shortname, type, secret, description } = req.body;
        
        const result = await db.query(
            `UPDATE nas SET
                nasname = $1, shortname = $2, type = $3, secret = $4, description = $5
             WHERE id = $6
             RETURNING *`,
            [nasname, shortname, type, secret, description, req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'NAS device not found' } });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update NAS error:', error);
        res.status(500).json({ error: { message: 'Failed to update NAS device' } });
    }
});

// Delete NAS device
router.delete('/nas/:id', async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM nas WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'NAS device not found' } });
        }
        
        res.json({ message: 'NAS device deleted successfully' });
    } catch (error) {
        console.error('Delete NAS error:', error);
        res.status(500).json({ error: { message: 'Failed to delete NAS device' } });
    }
});

// Get active sessions
router.get('/sessions', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                acctsessionid, username, nasipaddress, framedipaddress,
                acctstarttime, acctinputoctets, acctoutputoctets
             FROM radacct
             WHERE acctstoptime IS NULL
             ORDER BY acctstarttime DESC`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: { message: 'Failed to get active sessions' } });
    }
});

// Get accounting data for a user
router.get('/accounting/:username', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        
        const result = await db.query(
            `SELECT *
             FROM radacct
             WHERE username = $1
             ORDER BY acctstarttime DESC
             LIMIT $2`,
            [req.params.username, limit]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get accounting error:', error);
        res.status(500).json({ error: { message: 'Failed to get accounting data' } });
    }
});

// Get RADIUS statistics
router.get('/stats', async (req, res) => {
    try {
        // Active sessions count
        const activeSessions = await db.query(
            'SELECT COUNT(*) as count FROM radacct WHERE acctstoptime IS NULL'
        );
        
        // Total users
        const totalUsers = await db.query(
            'SELECT COUNT(*) as count FROM radcheck WHERE attribute = \'Cleartext-Password\''
        );
        
        // Today's data usage
        const todayUsage = await db.query(
            `SELECT 
                COALESCE(SUM(acctinputoctets), 0) as input,
                COALESCE(SUM(acctoutputoctets), 0) as output
             FROM radacct
             WHERE DATE(acctstarttime) = CURRENT_DATE`
        );
        
        res.json({
            activeSessions: parseInt(activeSessions.rows[0].count),
            totalUsers: parseInt(totalUsers.rows[0].count),
            todayUsage: {
                input: parseInt(todayUsage.rows[0].input),
                output: parseInt(todayUsage.rows[0].output),
                total: parseInt(todayUsage.rows[0].input) + parseInt(todayUsage.rows[0].output)
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: { message: 'Failed to get statistics' } });
    }
});

module.exports = router;
