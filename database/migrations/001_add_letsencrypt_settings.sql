-- Migration: 001 - Add Let's Encrypt settings
-- Date: 2024-01-07
-- Description: Add Let's Encrypt settings to existing installations

BEGIN;

-- Add new system settings if they don't exist
INSERT INTO system_settings (key, value, description) 
VALUES 
    ('ssl_method', '', 'SSL certificate method: letsencrypt or manual'),
    ('letsencrypt_domain', '', 'Domain name for Let''s Encrypt certificate'),
    ('letsencrypt_email', '', 'Email address for Let''s Encrypt notifications')
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- Rollback:
-- DELETE FROM system_settings WHERE key IN ('ssl_method', 'letsencrypt_domain', 'letsencrypt_email');
