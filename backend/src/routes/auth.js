const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find user
        const result = await db.query(
            'SELECT id, username, email, password_hash, full_name, role, is_active FROM users WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: { message: 'Invalid credentials' } });
        }
        
        const user = result.rows[0];
        
        if (!user.is_active) {
            return res.status(401).json({ error: { message: 'Account is inactive' } });
        }
        
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: { message: 'Invalid credentials' } });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: { message: 'Login failed' } });
    }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, username, email, full_name, role FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }
        
        const user = result.rows[0];
        
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            role: user.role
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: { message: 'Failed to get user' } });
    }
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Get user with password hash
        const result = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );
        
        const user = result.rows[0];
        
        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: { message: 'Current password is incorrect' } });
        }
        
        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await db.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newPasswordHash, req.user.id]
        );
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: { message: 'Failed to change password' } });
    }
});

module.exports = router;
