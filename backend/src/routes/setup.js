const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const acme = require('acme-client');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Middleware to check if setup is not completed
// Prevents abuse of setup endpoints after initial configuration
async function requireSetupNotCompleted(req, res, next) {
    try {
        const result = await db.query(
            "SELECT value FROM system_settings WHERE key = 'setup_completed'"
        );
        
        if (result.rows[0]?.value === 'true') {
            return res.status(403).json({ 
                error: { message: 'Setup already completed. These endpoints are disabled.' } 
            });
        }
        
        next();
    } catch (error) {
        console.error('Setup check error:', error);
        res.status(500).json({ error: { message: 'Failed to verify setup status' } });
    }
}

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
router.post('/root-user', requireSetupNotCompleted, async (req, res) => {
    try {
        const { username, email, password, fullName } = req.body;
        
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
router.post('/ssl', requireSetupNotCompleted, async (req, res) => {
    try {
        const { enabled, method, certificate, privateKey, domain, email } = req.body;
        
        if (!enabled) {
            // Skip SSL configuration
            await db.query(
                "UPDATE system_settings SET value = 'false' WHERE key = 'ssl_enabled'"
            );
            
            return res.json({ message: 'SSL configuration skipped', sslEnabled: false });
        }
        
        const sslDir = path.join(__dirname, '../../../ssl');
        
        if (method === 'letsencrypt') {
            // Validate required fields for Let's Encrypt
            if (!domain || !email) {
                return res.status(400).json({ 
                    error: { message: 'Domain and email are required for Let\'s Encrypt' } 
                });
            }
            
            try {
                // Create ACME client
                // Use staging environment if LETSENCRYPT_STAGING=true for testing
                const useStaging = process.env.LETSENCRYPT_STAGING === 'true';
                const directoryUrl = useStaging 
                    ? acme.directory.letsencrypt.staging 
                    : acme.directory.letsencrypt.production;
                
                const accountKey = await acme.forge.createPrivateKey();
                const client = new acme.Client({
                    directoryUrl,
                    accountKey
                });
                
                if (useStaging) {
                    console.log('Using Let\'s Encrypt staging environment for testing');
                }
                
                // Create account
                await client.createAccount({
                    termsOfServiceAgreed: true,
                    contact: [`mailto:${email}`]
                });
                
                // Create certificate key
                const [certKey, certCsr] = await acme.forge.createCsr({
                    commonName: domain
                });
                
                // Order certificate
                const cert = await client.auto({
                    csr: certCsr,
                    email,
                    termsOfServiceAgreed: true,
                    challengeCreateFn: async (authz, challenge, keyAuthorization) => {
                        // Store challenge for HTTP-01 validation
                        const challengeDir = path.join(sslDir, '.well-known', 'acme-challenge');
                        await fs.mkdir(challengeDir, { recursive: true });
                        await fs.writeFile(
                            path.join(challengeDir, challenge.token),
                            keyAuthorization
                        );
                    },
                    challengeRemoveFn: async (authz, challenge) => {
                        // Clean up challenge file
                        const challengeFile = path.join(sslDir, '.well-known', 'acme-challenge', challenge.token);
                        try {
                            await fs.unlink(challengeFile);
                        } catch (err) {
                            // Ignore error if file doesn't exist (ENOENT)
                            if (err.code !== 'ENOENT') {
                                console.error('Error removing challenge file:', err);
                            }
                        }
                    }
                });
                
                // Save certificate and key
                await fs.writeFile(path.join(sslDir, 'cert.pem'), cert);
                await fs.writeFile(path.join(sslDir, 'key.pem'), certKey);
                
                // Store Let's Encrypt configuration for renewal
                await db.query(
                    "UPDATE system_settings SET value = $1 WHERE key = 'letsencrypt_domain'",
                    [domain]
                );
                await db.query(
                    "UPDATE system_settings SET value = $1 WHERE key = 'letsencrypt_email'",
                    [email]
                );
                await db.query(
                    "UPDATE system_settings SET value = 'letsencrypt' WHERE key = 'ssl_method'"
                );
                
                // Update setting
                await db.query(
                    "UPDATE system_settings SET value = 'true' WHERE key = 'ssl_enabled'"
                );
                
                res.json({ 
                    message: 'Let\'s Encrypt certificate obtained successfully', 
                    sslEnabled: true,
                    domain 
                });
            } catch (error) {
                console.error('Let\'s Encrypt error:', error);
                return res.status(500).json({ 
                    error: { 
                        message: `Failed to obtain Let's Encrypt certificate: ${error.message}` 
                    } 
                });
            }
        } else if (method === 'manual' && certificate && privateKey) {
            // Manual certificate upload
            await fs.writeFile(path.join(sslDir, 'cert.pem'), certificate);
            await fs.writeFile(path.join(sslDir, 'key.pem'), privateKey);
            
            await db.query(
                "UPDATE system_settings SET value = 'manual' WHERE key = 'ssl_method'"
            );
            
            // Update setting
            await db.query(
                "UPDATE system_settings SET value = 'true' WHERE key = 'ssl_enabled'"
            );
            
            res.json({ message: 'SSL configured successfully', sslEnabled: true });
        } else {
            return res.status(400).json({ 
                error: { message: 'Invalid SSL configuration method or missing required fields' } 
            });
        }
    } catch (error) {
        console.error('SSL configuration error:', error);
        res.status(500).json({ error: { message: 'Failed to configure SSL' } });
    }
});

// Complete setup
router.post('/complete', requireSetupNotCompleted, async (req, res) => {
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
