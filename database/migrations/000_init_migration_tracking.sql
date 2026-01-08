-- Migration: 000 - Initialize migration tracking system
-- Date: 2024-01-08
-- Description: Create schema_migrations table to track applied migrations

BEGIN;

-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(10) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
    description TEXT
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
ON schema_migrations(applied_at);

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('000', 'Initialize migration tracking system')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- This migration is safe to run multiple times
-- Rollback: DROP TABLE IF EXISTS schema_migrations CASCADE;
