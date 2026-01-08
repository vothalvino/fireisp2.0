# Database Migrations

This directory contains database migration scripts for FireISP.

## Migration Naming Convention

Migrations are named using the following format:
```
XXX_descriptive_name.sql
```

Where:
- `XXX` is a zero-padded sequential number (001, 002, 003, etc.)
- `descriptive_name` briefly describes what the migration does
- All migrations use `.sql` extension

Examples:
- `001_add_letsencrypt_settings.sql`
- `002_add_user_roles.sql`
- `003_add_invoice_status_index.sql`

## Migration Order

Migrations are applied in numerical order. Always increment the number for new migrations.

## Creating a New Migration

1. Determine the next migration number:
   ```bash
   ls -1 database/migrations/*.sql | tail -1
   ```

2. Create a new migration file:
   ```bash
   touch database/migrations/XXX_your_migration_name.sql
   ```

3. Write idempotent SQL:
   - Use `IF NOT EXISTS` for creating tables/columns
   - Use `ON CONFLICT DO NOTHING` for inserts
   - Use `IF EXISTS` for drops
   - Add rollback comments for complex changes

4. Test the migration:
   ```bash
   docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/XXX_your_migration_name.sql
   ```

## Migration Template

```sql
-- Migration: XXX - Description of changes
-- Date: YYYY-MM-DD
-- Author: Your Name

BEGIN;

-- Add your migration SQL here
-- Example:
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS new_field VARCHAR(255);

-- Insert new settings if needed
-- INSERT INTO system_settings (key, value, description) 
-- VALUES ('new_setting', 'default_value', 'Description')
-- ON CONFLICT (key) DO NOTHING;

COMMIT;

-- Rollback instructions (commented):
-- To rollback this migration, run:
-- ALTER TABLE clients DROP COLUMN IF EXISTS new_field;
-- DELETE FROM system_settings WHERE key = 'new_setting';
```

## Tracking Applied Migrations

The update script automatically tracks which migrations have been applied using the `schema_migrations` table.

To check which migrations have been applied:
```bash
docker-compose exec postgres psql -U fireisp -c "SELECT * FROM schema_migrations ORDER BY version;"
```

## Manual Migration Application

If you need to manually apply a migration:

```bash
# Make sure postgres is running
docker-compose up -d postgres

# Wait for it to be ready
sleep 5

# Apply the migration
docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/XXX_migration_name.sql

# Record it in tracking table (if schema_migrations exists)
docker-compose exec postgres psql -U fireisp -c "INSERT INTO schema_migrations (version, applied_at) VALUES ('XXX', NOW()) ON CONFLICT DO NOTHING;"
```

## Migration Best Practices

1. **Keep migrations small and focused**
   - One logical change per migration
   - Easier to test and rollback

2. **Make migrations idempotent**
   - Safe to run multiple times
   - Use IF EXISTS/IF NOT EXISTS clauses

3. **Test before committing**
   - Apply migration to a test database
   - Verify the changes work as expected
   - Test rollback if applicable

4. **Document complex changes**
   - Add comments explaining the purpose
   - Note any dependencies
   - Include rollback instructions

5. **Never modify existing migrations**
   - Once applied in production, migrations are immutable
   - Create a new migration to fix issues

6. **Include data migrations carefully**
   - Consider performance impact
   - May need to run in batches for large datasets
   - Test with production-sized data

## Rollback Strategy

For each migration, document how to rollback:

1. **Simple rollbacks**
   - Comment the rollback SQL in the migration file

2. **Complex rollbacks**
   - Create a separate rollback script: `XXX_rollback_description.sql`
   - Document manual steps needed

3. **Data migrations**
   - Some migrations may not be reversible
   - Document this clearly in the migration

## Example Migrations

### Adding a Column

```sql
-- Migration: 001 - Add phone number to clients
-- Date: 2024-01-08

BEGIN;

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

COMMIT;

-- Rollback:
-- ALTER TABLE clients DROP COLUMN IF EXISTS phone;
```

### Adding System Settings

```sql
-- Migration: 002 - Add notification settings
-- Date: 2024-01-08

BEGIN;

INSERT INTO system_settings (key, value, description) VALUES
('notify_on_expiry', 'true', 'Send notifications when services expire'),
('expiry_notice_days', '7', 'Days before expiry to send notice')
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- Rollback:
-- DELETE FROM system_settings WHERE key IN ('notify_on_expiry', 'expiry_notice_days');
```

### Creating an Index

```sql
-- Migration: 003 - Add index to improve invoice queries
-- Date: 2024-01-08

BEGIN;

CREATE INDEX IF NOT EXISTS idx_invoices_client_id 
ON invoices(client_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status 
ON invoices(status);

COMMIT;

-- Rollback:
-- DROP INDEX IF EXISTS idx_invoices_client_id;
-- DROP INDEX IF EXISTS idx_invoices_status;
```

## Migration Testing Checklist

Before deploying a migration:

- [ ] Migration runs successfully on a test database
- [ ] Migration is idempotent (can run multiple times safely)
- [ ] No data is lost
- [ ] Application still works after migration
- [ ] Rollback procedure is documented and tested
- [ ] Performance impact is acceptable
- [ ] Migration is committed to version control

## See Also

- [UPDATE.md](../UPDATE.md) - Update procedures
- [CHANGELOG.md](../CHANGELOG.md) - Version history
- Database schema documentation
