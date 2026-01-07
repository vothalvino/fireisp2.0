const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Check setup status
router.get('/status', async (req, res) => {
    try {
        const result = await db.query(
            "SELECT value FROM system_settings WHERE key = 'setup_completed'"
        );
        
        const setupCompleted = result.rows[0]?.value === 'true';
        
        res.json({ 
            setupCompleted,
            sslEnabled: false
        });
    } catch (error) {
        console.error('Setup status error:', error);
        res.status(500).json({ error: { message: 'Failed to check setup status' } });
    }
});

// Create root user (Step 1 of setup)
router.post('/root-user', async (req, res) => {
    try {
        const { username, email, password, fullName } = req.body;
        
        // Check if setup is already completed
        const setupCheck = await db.query(
            "SELECT value FROM system_settings WHERE key = 'setup_completed'"
        );
        
        if (setupCheck.rows[0]?.value === 'true') {
            return res.status(400).json({ error: { message: 'Setup already completed' } });
        }
        
        // Check if user already exists
        const userCheck = await db.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: { message: 'User already exists' } });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create root user
        const result = await db.query(
            `INSERT INTO users (username, email, password_hash, full_name, role)
             VALUES ($1, $2, $3, $4, 'root')
             RETURNING id, username, email, full_name, role`,
            [username, email, passwordHash, fullName]
        );
        
        const user = result.rows[0];
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Root user created successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Root user creation error:', error);
        res.status(500).json({ error: { message: 'Failed to create root user' } });
    }
});

// Configure SSL (Step 2 of setup)
router.post('/ssl', async (req, res) => {
    try {
        const { enabled, certificate, privateKey } = req.body;
        
        if (enabled && certificate && privateKey) {
            const sslDir = path.join(__dirname, '../../../ssl');
            
            // Save certificate and key
            await fs.writeFile(path.join(sslDir, 'cert.pem'), certificate);
            await fs.writeFile(path.join(sslDir, 'key.pem'), privateKey);
            
            // Update setting
            await db.query(
                "UPDATE system_settings SET value = 'true' WHERE key = 'ssl_enabled'"
            );
            
            res.json({ message: 'SSL configured successfully', sslEnabled: true });
        } else {
            // Skip SSL configuration
            await db.query(
                "UPDATE system_settings SET value = 'false' WHERE key = 'ssl_enabled'"
            );
            
            res.json({ message: 'SSL configuration skipped', sslEnabled: false });
        }
    } catch (error) {
        console.error('SSL configuration error:', error);
        res.status(500).json({ error: { message: 'Failed to configure SSL' } });
    }
});

// Complete setup
router.post('/complete', async (req, res) => {
    try {
        const { companyName, companyEmail, companyPhone } = req.body;
        
        // Update company settings
        await db.query(
            "UPDATE system_settings SET value = $1 WHERE key = 'company_name'",
            [companyName || 'FireISP']
        );
        
        await db.query(
            "UPDATE system_settings SET value = $1 WHERE key = 'company_email'",
            [companyEmail || '']
        );
        
        await db.query(
            "UPDATE system_settings SET value = $1 WHERE key = 'company_phone'",
            [companyPhone || '']
        );
        
        // Mark setup as completed
        await db.query(
            "UPDATE system_settings SET value = 'true' WHERE key = 'setup_completed'"
        );
        
        res.json({ message: 'Setup completed successfully' });
    } catch (error) {
        console.error('Setup completion error:', error);
        res.status(500).json({ error: { message: 'Failed to complete setup' } });
    }
});

module.exports = router;
