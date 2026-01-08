-- Migration to add Let's Encrypt settings to existing installations
-- Run this if you're upgrading from a version without Let's Encrypt support

-- Add new system settings if they don't exist
INSERT INTO system_settings (key, value, description) 
VALUES 
    ('ssl_method', '', 'SSL certificate method: letsencrypt or manual'),
    ('letsencrypt_domain', '', 'Domain name for Let''s Encrypt certificate'),
    ('letsencrypt_email', '', 'Email address for Let''s Encrypt notifications')
ON CONFLICT (key) DO NOTHING;
