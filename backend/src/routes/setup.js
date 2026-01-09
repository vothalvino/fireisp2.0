const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const acme = require('acme-client');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Let's Encrypt challenge file sync delay (in milliseconds)
// This delay allows time for the file system and nginx to sync before ACME validation
const CHALLENGE_FILE_SYNC_DELAY_MS = 1000;

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
            
            // Validate domain format (basic check)
            // Allow single-character labels and properly validate domain structure
            const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
            if (!domainRegex.test(domain)) {
                return res.status(400).json({ 
                    error: { message: 'Invalid domain format. Please enter a valid domain name (e.g., example.com or subdomain.example.com)' } 
                });
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ 
                    error: { message: 'Invalid email format' } 
                });
            }
            
            try {
                console.log('[Let\'s Encrypt] Starting certificate acquisition process');
                console.log(`[Let\'s Encrypt] Domain: ${domain}`);
                console.log(`[Let\'s Encrypt] Email: ${email}`);
                
                // Pre-flight check: Ensure SSL directory and .well-known/acme-challenge exists
                const sslWellKnownDir = path.join(sslDir, '.well-known');
                const challengeDirPath = path.join(sslWellKnownDir, 'acme-challenge');
                
                console.log('[Let\'s Encrypt] Verifying SSL directory structure...');
                await fs.mkdir(challengeDirPath, { recursive: true });
                await fs.chmod(sslWellKnownDir, 0o755);
                await fs.chmod(challengeDirPath, 0o755);
                console.log(`[Let\'s Encrypt] Challenge directory ready at: ${challengeDirPath}`);
                
                // Create ACME client
                // Use staging environment if LETSENCRYPT_STAGING=true for testing
                const useStaging = process.env.LETSENCRYPT_STAGING === 'true';
                const directoryUrl = useStaging 
                    ? acme.directory.letsencrypt.staging 
                    : acme.directory.letsencrypt.production;
                
                if (useStaging) {
                    console.log('[Let\'s Encrypt] Using staging environment for testing');
                } else {
                    console.log('[Let\'s Encrypt] Using production environment');
                }
                
                console.log('[Let\'s Encrypt] Creating ACME account key');
                const accountKey = await acme.forge.createPrivateKey();
                const client = new acme.Client({
                    directoryUrl,
                    accountKey
                });
                
                // Create account
                console.log('[Let\'s Encrypt] Creating ACME account');
                await client.createAccount({
                    termsOfServiceAgreed: true,
                    contact: [`mailto:${email}`]
                });
                
                // Create certificate key
                console.log('[Let\'s Encrypt] Creating certificate signing request');
                const [certKey, certCsr] = await acme.forge.createCsr({
                    commonName: domain
                });
                
                // Order certificate
                const cert = await client.auto({
                    csr: certCsr,
                    email,
                    termsOfServiceAgreed: true,
                    challengePriority: ['http-01'],
                    challengeCreateFn: async (authz, challenge, keyAuthorization) => {
                        // Store challenge for HTTP-01 validation
                        console.log(`[Let's Encrypt] Creating HTTP-01 challenge for domain`);
                        console.log(`[Let's Encrypt] Challenge token length: ${challenge.token.length} characters`);
                        
                        const challengeDir = path.join(sslDir, '.well-known', 'acme-challenge');
                        await fs.mkdir(challengeDir, { recursive: true });
                        
                        // Set directory permissions to ensure nginx can access
                        await fs.chmod(path.join(sslDir, '.well-known'), 0o755);
                        await fs.chmod(challengeDir, 0o755);
                        
                        const challengeFilePath = path.join(challengeDir, challenge.token);
                        await fs.writeFile(challengeFilePath, keyAuthorization);
                        
                        // Set proper permissions for nginx to read
                        await fs.chmod(challengeFilePath, 0o644);
                        
                        // Verify file was created successfully
                        try {
                            const fileStats = await fs.stat(challengeFilePath);
                            const filePermissions = (fileStats.mode & 0o777).toString(8);
                            console.log(`[Let's Encrypt] Challenge file created successfully`);
                            console.log(`[Let's Encrypt] File size: ${fileStats.size} bytes, permissions: ${filePermissions}`);
                        } catch (statErr) {
                            console.error(`[Let's Encrypt] ERROR: Challenge file verification failed:`, statErr);
                            throw statErr;
                        }
                        
                        // Give time for the file system and nginx to sync
                        console.log(`[Let's Encrypt] Waiting ${CHALLENGE_FILE_SYNC_DELAY_MS}ms for file system sync...`);
                        await new Promise(resolve => setTimeout(resolve, CHALLENGE_FILE_SYNC_DELAY_MS));
                        console.log(`[Let's Encrypt] Challenge file ready for validation`);
                    },
                    challengeRemoveFn: async (authz, challenge) => {
                        // Clean up challenge file
                        console.log(`[Let's Encrypt] Removing challenge file`);
                        const challengeFile = path.join(sslDir, '.well-known', 'acme-challenge', challenge.token);
                        try {
                            await fs.unlink(challengeFile);
                            console.log(`[Let's Encrypt] Challenge file removed successfully`);
                        } catch (err) {
                            // Ignore error if file doesn't exist (ENOENT)
                            if (err.code !== 'ENOENT') {
                                console.error('[Let\'s Encrypt] Error removing challenge file:', err);
                            }
                        }
                    }
                });
                
                // Save certificate and key
                console.log('[Let\'s Encrypt] Certificate obtained successfully');
                console.log('[Let\'s Encrypt] Saving certificate files');
                await fs.writeFile(path.join(sslDir, 'cert.pem'), cert);
                await fs.writeFile(path.join(sslDir, 'key.pem'), certKey);
                
                // Store Let's Encrypt configuration for renewal
                console.log('[Let\'s Encrypt] Updating database settings');
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
                
                console.log('[Let\'s Encrypt] Setup completed successfully');
                res.json({ 
                    message: 'Let\'s Encrypt certificate obtained successfully', 
                    sslEnabled: true,
                    domain 
                });
            } catch (error) {
                console.error('[Let\'s Encrypt] Error:', error);
                console.error('[Let\'s Encrypt] Error details:', {
                    message: error.message,
                    stack: error.stack
                });
                
                let errorMessage = `Failed to obtain Let's Encrypt certificate: ${error.message}`;
                
                // Provide more helpful error messages for common issues
                // Check for specific error patterns more carefully to avoid false positives
                if (error.message && (error.message.toLowerCase().includes('dns resolution') || 
                    error.message.toLowerCase().includes('nxdomain') ||
                    error.message.toLowerCase().includes('getaddrinfo'))) {
                    errorMessage += '. Please ensure your domain\'s DNS A record points to this server\'s IP address.';
                } else if (error.message && (error.message.toLowerCase().includes('challenge') && 
                    (error.message.toLowerCase().includes('fail') || error.message.toLowerCase().includes('invalid')))) {
                    errorMessage += '. Please ensure port 80 is accessible from the internet and not blocked by a firewall.';
                } else if (error.message && error.message.toLowerCase().includes('rate limit')) {
                    errorMessage += '. Let\'s Encrypt rate limit reached. Consider using staging mode or try again later.';
                } else if (error.message && error.message.toLowerCase().includes('unauthorized')) {
                    errorMessage += '. The certificate request was not authorized. This could be due to DNS issues or challenge validation failure.';
                }
                
                return res.status(500).json({ 
                    error: { 
                        message: errorMessage 
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
