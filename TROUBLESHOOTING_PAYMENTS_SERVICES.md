# Troubleshooting: Service and Payment Creation Issues

## Problem

When trying to add a service or register a payment, the operation fails with an error.

## Root Cause

The issue is caused by missing database migrations. Specifically:

- **Migration 005** (payment system): Required for payment registration to work
- **Migration 006** (recurring invoices): Required for service creation with recurring billing

These migrations add critical tables and columns:
- `payment_allocations` table for tracking payment-to-invoice allocations
- `clients.credit_balance` column for tracking client credit
- `client_services.recurring_billing_enabled` column for service billing configuration
- `client_services.billing_day_of_month` column for custom billing dates
- `client_services.days_until_due` column for custom payment terms

## Quick Fix

### Option 1: Run the Update Script (Recommended)

The update script automatically applies all pending migrations:

```bash
sudo ./update.sh
```

### Option 2: Use the Migration Diagnostic Tool

We've provided a diagnostic script that checks which migrations are applied and can apply missing ones:

```bash
sudo bash database/check-migrations.sh
```

This script will:
1. Check if migrations are properly applied
2. List any pending migrations
3. Offer to apply missing migrations automatically
4. Verify critical tables exist

### Option 3: Manual Migration Application

If you prefer to apply migrations manually:

```bash
# Ensure postgres is running
docker-compose up -d postgres
sleep 5

# Apply migration 005 (payment system)
docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/005_add_payment_system.sql

# Apply migration 006 (recurring invoices)
docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/006_add_recurring_invoices.sql

# Verify the migrations were applied
docker-compose exec postgres psql -U fireisp fireisp -c "SELECT * FROM schema_migrations ORDER BY version;"
```

## Verification

After applying the migrations, verify the fix:

### Test Service Creation

1. Go to the Services page
2. Click "Add Service"
3. Fill in the required fields:
   - Select a client
   - Select a service plan
   - Choose activation date
   - Configure recurring billing settings
4. Click "Create Service"
5. Service should be created successfully

### Test Payment Registration

1. Go to the Payments page
2. Click "Register Payment"
3. Select a client
4. Enter payment details
5. Select invoices to pay (if any)
6. Click "Register Payment"
7. Payment should be registered successfully

## Common Errors and Solutions

### Error: "Failed to load client data: Failed to get unpaid invoices"

**Cause:** The `amount_paid` column is missing from the invoices table, or Migration 005 was not applied correctly

**Solution:** 
1. Apply migration 005:
   ```bash
   docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/005_add_payment_system.sql
   ```
2. Verify the column exists:
   ```bash
   docker-compose exec postgres psql -U fireisp fireisp -c "\d invoices"
   ```
   Look for the `amount_paid` column in the output
3. Restart the backend to reload the schema:
   ```bash
   docker-compose restart backend
   ```

### Error: "column clients.credit_balance does not exist"

**Cause:** Migration 005 not applied

**Solution:** Apply migration 005:
```bash
docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/005_add_payment_system.sql
```

### Error: "relation payment_allocations does not exist"

**Cause:** Migration 005 not applied

**Solution:** Apply migration 005 (same as above)

### Error: "column client_services.recurring_billing_enabled does not exist"

**Cause:** Migration 006 not applied

**Solution:** Apply migration 006:
```bash
docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/006_add_recurring_invoices.sql
```

### Error: "duplicate key value violates unique constraint"

**Cause:** Trying to create a service with a username that already exists

**Solution:** Use a different username or let the system auto-generate credentials

### Error: "Failed to create client service" (generic)

**Cause:** Multiple possible causes

**Solution:** 
1. Check backend logs: `docker-compose logs backend`
2. Verify database is running: `docker-compose ps postgres`
3. Verify migrations are applied: `bash database/check-migrations.sh`

## Prevention

To prevent this issue in the future:

1. **Always run the update script** when updating FireISP:
   ```bash
   sudo ./update.sh
   ```

2. **Verify migrations after installation** using the diagnostic tool:
   ```bash
   sudo bash database/check-migrations.sh
   ```

3. **Check logs** if anything fails:
   ```bash
   docker-compose logs -f backend
   ```

## Additional Resources

- [Database Migrations README](database/migrations/README.md) - Detailed migration documentation
- [Update Script Documentation](UPDATE.md) - Update process details
- [Quick Start Guide](QUICKSTART.md) - Initial setup instructions

## Need Help?

If you're still experiencing issues after following this guide:

1. Check the backend logs for detailed error messages:
   ```bash
   docker-compose logs backend | tail -50
   ```

2. Verify all containers are running:
   ```bash
   docker-compose ps
   ```

3. Check database connectivity:
   ```bash
   docker-compose exec postgres psql -U fireisp fireisp -c "SELECT current_database();"
   ```

4. Open an issue on GitHub with:
   - Error messages from logs
   - Output of `bash database/check-migrations.sh`
   - Steps to reproduce the issue
