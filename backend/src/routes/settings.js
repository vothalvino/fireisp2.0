const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authMiddleware } = require('../middleware/auth');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

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

// Check if certbot is available
router.get('/ssl/certbot-check', async (req, res) => {
    try {
        console.log('[Certbot] Checking certbot availability...');
        
        // Check if certbot is installed in the frontend container
        const frontendContainer = 'fireisp-frontend';
        try {
            const { stdout } = await execAsync(`docker exec ${frontendContainer} certbot --version`);
            const version = stdout.trim();
            console.log('[Certbot] Found:', version);
            
            // Check if nginx plugin is available
            let nginxPluginAvailable = false;
            try {
                await execAsync(`docker exec ${frontendContainer} certbot plugins 2>&1 | grep -i nginx`);
                nginxPluginAvailable = true;
                console.log('[Certbot] Nginx plugin is available');
            } catch (pluginErr) {
                console.log('[Certbot] Nginx plugin not found');
            }
            
            res.json({
                available: true,
                version: version,
                nginxPlugin: nginxPluginAvailable
            });
        } catch (certbotErr) {
            console.log('[Certbot] Not installed:', certbotErr.message);
            res.json({
                available: false,
                version: null,
                nginxPlugin: false,
                message: 'Certbot is not installed in the frontend container. Rebuild containers with: docker compose build --no-cache frontend && docker compose up -d'
            });
        }
    } catch (error) {
        console.error('[Certbot] Check error:', error);
        res.status(500).json({ 
            error: { message: 'Failed to check certbot availability' } 
        });
    }
});

// Configure SSL using certbot
router.post('/ssl/certbot', async (req, res) => {
    try {
        const { domain, email, dryRun } = req.body;
        
        // Validate inputs
        if (!domain || !email) {
            return res.status(400).json({ 
                error: { message: 'Domain and email are required' } 
            });
        }
        
        // Validate domain format
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
        if (!domainRegex.test(domain)) {
            return res.status(400).json({ 
                error: { message: 'Invalid domain format' } 
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: { message: 'Invalid email format' } 
            });
        }
        
        console.log('[Certbot] Starting certificate acquisition...');
        console.log(`[Certbot] Domain: ${domain}`);
        console.log(`[Certbot] Email: ${email}`);
        console.log(`[Certbot] Dry run: ${dryRun || false}`);
        
        // Check if certbot is available in frontend container
        const frontendContainer = 'fireisp-frontend';
        try {
            await execAsync(`docker exec ${frontendContainer} certbot --version`);
        } catch (certbotErr) {
            return res.status(500).json({
                error: { 
                    message: 'Certbot is not installed in the frontend container. Please rebuild the containers with: docker compose build --no-cache frontend && docker compose up -d' 
                }
            });
        }
        
        // Build certbot command to run inside frontend container
        // Use --nginx to automatically configure nginx
        // Use --non-interactive to avoid prompts
        // Use --agree-tos to accept terms
        // Use --email for notifications
        const dryRunFlag = dryRun ? '--dry-run' : '';
        const certbotCmd = `docker exec ${frontendContainer} certbot --nginx -d ${domain} --non-interactive --agree-tos --email ${email} ${dryRunFlag}`;
        
        console.log('[Certbot] Executing command in frontend container...');
        
        try {
            const { stdout, stderr } = await execAsync(certbotCmd, { 
                timeout: 120000 // 2 minute timeout
            });
            
            console.log('[Certbot] Output:', stdout);
            if (stderr) {
                console.log('[Certbot] Stderr:', stderr);
            }
            
            // If dry run, don't update database
            if (dryRun) {
                console.log('[Certbot] Dry run completed successfully');
                return res.json({
                    success: true,
                    message: 'Dry run completed successfully. Certificate acquisition would succeed.',
                    dryRun: true
                });
            }
            
            // Update database settings
            console.log('[Certbot] Updating database settings...');
            await db.query(
                "INSERT INTO system_settings (key, value, updated_at) VALUES ('letsencrypt_domain', $1, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP",
                [domain]
            );
            await db.query(
                "INSERT INTO system_settings (key, value, updated_at) VALUES ('letsencrypt_email', $1, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP",
                [email]
            );
            await db.query(
                "INSERT INTO system_settings (key, value, updated_at) VALUES ('ssl_method', 'certbot', CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = 'certbot', updated_at = CURRENT_TIMESTAMP"
            );
            await db.query(
                "INSERT INTO system_settings (key, value, updated_at) VALUES ('ssl_enabled', 'true', CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = CURRENT_TIMESTAMP"
            );
            
            console.log('[Certbot] Certificate acquired and configured successfully');
            res.json({
                success: true,
                message: 'SSL certificate acquired and nginx configured successfully',
                domain: domain
            });
        } catch (execError) {
            console.error('[Certbot] Execution error:', execError);
            
            // Parse error message for common issues
            let errorMessage = 'Failed to acquire SSL certificate with certbot. ';
            let troubleshootingSteps = [];
            
            const errorOutput = execError.stderr || execError.stdout || execError.message;
            
            if (errorOutput.toLowerCase().includes('dns')) {
                errorMessage += 'DNS resolution failed.';
                troubleshootingSteps = [
                    `Verify your domain's DNS A record points to this server's public IP`,
                    'Wait 5-60 minutes for DNS propagation',
                    `Test DNS: nslookup ${domain}`,
                    'Check DNS globally at https://dnschecker.org'
                ];
            } else if (errorOutput.toLowerCase().includes('challenge') || errorOutput.toLowerCase().includes('authorization')) {
                errorMessage += 'Challenge validation failed.';
                troubleshootingSteps = [
                    'Ensure port 80 is open: sudo ufw allow 80/tcp',
                    'Ensure port 443 is open: sudo ufw allow 443/tcp',
                    'Verify nginx is running: docker ps',
                    `Test HTTP access: curl http://${domain}`
                ];
            } else if (errorOutput.toLowerCase().includes('rate limit')) {
                errorMessage += 'Let\'s Encrypt rate limit reached.';
                troubleshootingSteps = [
                    'Use dry-run mode for testing',
                    'Wait for rate limit reset (weekly)',
                    'See https://letsencrypt.org/docs/rate-limits/'
                ];
            } else if (errorOutput.toLowerCase().includes('timeout')) {
                errorMessage += 'Connection timeout.';
                troubleshootingSteps = [
                    'Check firewall settings',
                    'Verify server is accessible from internet',
                    'Check if behind NAT (configure port forwarding)'
                ];
            } else {
                errorMessage += errorOutput;
                troubleshootingSteps = [
                    'Check logs: docker compose logs frontend',
                    'Verify all prerequisites are met',
                    'Try dry-run mode first to test configuration'
                ];
            }
            
            const fullErrorMessage = `${errorMessage}\n\nTroubleshooting steps:\n${troubleshootingSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;
            
            return res.status(500).json({
                error: { message: fullErrorMessage },
                details: errorOutput
            });
        }
    } catch (error) {
        console.error('[Certbot] Error:', error);
        res.status(500).json({ 
            error: { message: 'Failed to configure SSL with certbot' } 
        });
    }
});

// Renew SSL certificate using certbot
router.post('/ssl/certbot-renew', async (req, res) => {
    try {
        console.log('[Certbot] Starting certificate renewal...');
        
        // Check if certbot is available in frontend container
        const frontendContainer = 'fireisp-frontend';
        try {
            await execAsync(`docker exec ${frontendContainer} certbot --version`);
        } catch (certbotErr) {
            return res.status(500).json({
                error: { 
                    message: 'Certbot is not installed in the frontend container' 
                }
            });
        }
        
        const certbotCmd = `docker exec ${frontendContainer} certbot renew --nginx --non-interactive`;
        
        console.log('[Certbot] Executing renewal command...');
        
        try {
            const { stdout, stderr } = await execAsync(certbotCmd, { 
                timeout: 120000 // 2 minute timeout
            });
            
            console.log('[Certbot] Renewal output:', stdout);
            if (stderr) {
                console.log('[Certbot] Stderr:', stderr);
            }
            
            res.json({
                success: true,
                message: 'Certificate renewal completed',
                output: stdout
            });
        } catch (execError) {
            console.error('[Certbot] Renewal error:', execError);
            
            return res.status(500).json({
                error: { 
                    message: 'Certificate renewal failed: ' + (execError.stderr || execError.message)
                }
            });
        }
    } catch (error) {
        console.error('[Certbot] Renewal error:', error);
        res.status(500).json({ 
            error: { message: 'Failed to renew certificate' } 
        });
    }
});

module.exports = router;
