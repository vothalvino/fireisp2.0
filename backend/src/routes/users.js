const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const bcrypt = require('bcrypt');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get all users
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, username, email, full_name, role, is_active, created_at, updated_at
             FROM users
             ORDER BY created_at DESC`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: { message: 'Failed to get users' } });
    }
});

// Get single user
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, username, email, full_name, role, is_active, created_at, updated_at
             FROM users
             WHERE id = $1`,
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: { message: 'Failed to get user' } });
    }
});

// Create new user
router.post('/', async (req, res) => {
    try {
        const { username, email, password, fullName, role } = req.body;
        
        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ 
                error: { message: 'Username, email, and password are required' } 
            });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        const result = await db.query(
            `INSERT INTO users (username, email, password_hash, full_name, role)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, username, email, full_name, role, is_active, created_at`,
            [username, email, passwordHash, fullName, role || 'user']
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create user error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ 
                error: { message: 'Username or email already exists' } 
            });
        }
        res.status(500).json({ error: { message: 'Failed to create user' } });
    }
});

// Update user details
router.put('/:id', async (req, res) => {
    try {
        const { username, email, fullName, role } = req.body;
        
        const result = await db.query(
            `UPDATE users SET
                username = $1, email = $2, full_name = $3, role = $4
             WHERE id = $5
             RETURNING id, username, email, full_name, role, is_active, created_at, updated_at`,
            [username, email, fullName, role, req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update user error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ 
                error: { message: 'Username or email already exists' } 
            });
        }
        res.status(500).json({ error: { message: 'Failed to update user' } });
    }
});

// Change user password
router.put('/:id/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Verify user can only change their own password unless admin
        if (req.user.id !== req.params.id && req.user.role !== 'admin') {
            return res.status(403).json({ 
                error: { message: 'Unauthorized to change this password' } 
            });
        }
        
        // Get current password hash
        const userResult = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.params.id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }
        
        // Verify current password (if not admin)
        if (req.user.role !== 'admin') {
            const validPassword = await bcrypt.compare(
                currentPassword, 
                userResult.rows[0].password_hash
            );
            
            if (!validPassword) {
                return res.status(400).json({ 
                    error: { message: 'Current password is incorrect' } 
                });
            }
        }
        
        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        await db.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newPasswordHash, req.params.id]
        );
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: { message: 'Failed to change password' } });
    }
});

// Update user status (activate/deactivate)
router.put('/:id/status', async (req, res) => {
    try {
        const { isActive } = req.body;
        
        // Prevent user from deactivating themselves
        if (req.user.id === req.params.id && !isActive) {
            return res.status(400).json({ 
                error: { message: 'Cannot deactivate your own account' } 
            });
        }
        
        const result = await db.query(
            `UPDATE users SET is_active = $1
             WHERE id = $2
             RETURNING id, username, email, full_name, role, is_active, created_at, updated_at`,
            [isActive, req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ error: { message: 'Failed to update user status' } });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    try {
        // Prevent user from deleting themselves
        if (req.user.id === req.params.id) {
            return res.status(400).json({ 
                error: { message: 'Cannot delete your own account' } 
            });
        }
        
        const result = await db.query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: { message: 'Failed to delete user' } });
    }
});

module.exports = router;
