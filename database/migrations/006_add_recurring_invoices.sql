-- Migration: Add Recurring Invoice Configuration
-- This migration adds fields needed for automatic recurring invoice generation

-- Add default billing configuration to system settings
INSERT INTO system_settings (key, value, description) VALUES
    ('default_billing_day', '1', 'Default day of month to generate invoices (1-28)'),
    ('default_days_to_pay', '15', 'Default number of days until invoice is due')
ON CONFLICT (key) DO NOTHING;

-- Add per-service billing configuration to client_services table
ALTER TABLE client_services 
ADD COLUMN IF NOT EXISTS billing_day_of_month INTEGER,
ADD COLUMN IF NOT EXISTS days_until_due INTEGER,
ADD COLUMN IF NOT EXISTS recurring_billing_enabled BOOLEAN DEFAULT true;

-- Add comments to explain the fields
COMMENT ON COLUMN client_services.billing_day_of_month IS 'Custom billing day for this service (1-28). If NULL, uses default_billing_day from system settings';
COMMENT ON COLUMN client_services.days_until_due IS 'Custom days until due for this service. If NULL, uses default_days_to_pay from system settings';
COMMENT ON COLUMN client_services.recurring_billing_enabled IS 'Whether to generate recurring invoices for this service';

-- Add index for recurring billing queries
CREATE INDEX IF NOT EXISTS idx_client_services_recurring_billing 
ON client_services(recurring_billing_enabled, status) 
WHERE recurring_billing_enabled = true AND status = 'active';

-- Add last_invoice_date to track when the last invoice was generated
ALTER TABLE client_services 
ADD COLUMN IF NOT EXISTS last_invoice_date DATE;

COMMENT ON COLUMN client_services.last_invoice_date IS 'Date when the last recurring invoice was generated for this service';
