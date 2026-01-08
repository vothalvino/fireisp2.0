const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get all settings
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM system_settings ORDER BY key'
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: { message: 'Failed to get settings' } });
    }
});

// Get single setting by key
router.get('/:key', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM system_settings WHERE key = $1',
            [req.params.key]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Setting not found' } });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({ error: { message: 'Failed to get setting' } });
    }
});

// Update setting
router.put('/:key', async (req, res) => {
    try {
        const { value } = req.body;
        
        const result = await db.query(
            `INSERT INTO system_settings (key, value, updated_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (key) 
             DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [req.params.key, value]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({ error: { message: 'Failed to update setting' } });
    }
});

// Create new setting
router.post('/', async (req, res) => {
    try {
        const { key, value, description } = req.body;
        
        const result = await db.query(
            `INSERT INTO system_settings (key, value, description)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [key, value, description]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create setting error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: { message: 'Setting key already exists' } });
        }
        res.status(500).json({ error: { message: 'Failed to create setting' } });
    }
});

// Bulk update settings
router.post('/bulk', async (req, res) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        
        const { settings } = req.body;
        
        for (const setting of settings) {
            await client.query(
                `INSERT INTO system_settings (key, value, updated_at)
                 VALUES ($1, $2, CURRENT_TIMESTAMP)
                 ON CONFLICT (key) 
                 DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
                [setting.key, setting.value]
            );
        }
        
        await client.query('COMMIT');
        
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Bulk update settings error:', error);
        res.status(500).json({ error: { message: 'Failed to update settings' } });
    } finally {
        client.release();
    }
});

// Delete setting
router.delete('/:key', async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM system_settings WHERE key = $1 RETURNING key',
            [req.params.key]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Setting not found' } });
        }
        
        res.json({ message: 'Setting deleted successfully' });
    } catch (error) {
        console.error('Delete setting error:', error);
        res.status(500).json({ error: { message: 'Failed to delete setting' } });
    }
});

module.exports = router;
