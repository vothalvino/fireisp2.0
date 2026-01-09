-- Add client_type column to clients table
-- Migration: 003_add_client_type
-- Description: Adds a client_type column to distinguish between personal and company clients

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT 'company' NOT NULL;

-- Add a check constraint to ensure only valid values
ALTER TABLE clients
ADD CONSTRAINT check_client_type CHECK (client_type IN ('personal', 'company'));

-- Add comment to the column
COMMENT ON COLUMN clients.client_type IS 'Type of client: personal or company';
