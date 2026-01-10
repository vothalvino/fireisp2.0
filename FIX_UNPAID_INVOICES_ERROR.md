# Fix: "Failed to load client data: Failed to get unpaid invoices"

## Problem Description

Users were encountering the error "Failed to load client data: Failed to get unpaid invoices" when trying to:
- Access the Payments page and select a client
- Load client data that includes unpaid invoices

## Root Cause

The error was caused by a database query attempting to use the `amount_paid` column in the `invoices` table. This column is added by migration 005 (`005_add_payment_system.sql`), but the system was not handling the case where this migration might not have been applied yet.

## Solution Implemented

### 1. Backend Improvements (payments.js)

Added robust error handling and a fallback mechanism to the `/payments/client/:clientId/unpaid-invoices` endpoint:

- **Primary Query**: Attempts to use the `amount_paid` column for accurate unpaid invoice calculation
- **Fallback Query**: If the primary query fails (e.g., column doesn't exist), falls back to a simpler query that uses the invoice total
- **Enhanced Logging**: Added detailed error logging to help diagnose issues
- **Development Mode Details**: Returns error details in development mode for easier debugging

### 2. Frontend Improvements

Enhanced error handling in both affected pages:

**Payments.jsx:**
- Added detailed error logging to console
- Display error details from backend when available
- Better error messages for users

**ClientDashboard.jsx:**
- Added error logging with response details
- Show alert with specific error message
- Improved user feedback when data loading fails

### 3. Database Schema Checker

Created a new script (`backend/scripts/check-db-schema.js`) that:
- Verifies the `amount_paid` column exists in the invoices table
- Checks for the `payment_allocations` table
- Verifies the `credit_balance` column in clients table
- Tests actual queries to ensure they work
- Provides clear output about what's missing and how to fix it

### 4. Documentation Updates

Updated `TROUBLESHOOTING_PAYMENTS_SERVICES.md` with:
- Specific section for the "Failed to get unpaid invoices" error
- Step-by-step solution instructions
- Verification commands
- Backend restart instructions

## How to Apply This Fix

### Step 1: Update Your Code

Pull the latest changes:
```bash
git pull origin copilot/fix-client-data-loading-issue
```

### Step 2: Check Database Schema

Run the database schema checker to verify if migrations are needed:
```bash
node backend/scripts/check-db-schema.js
```

Or use the migration diagnostic tool:
```bash
sudo bash database/check-migrations.sh
```

### Step 3: Apply Missing Migrations (if needed)

If the schema checker reports missing columns or tables, apply migration 005:
```bash
docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/005_add_payment_system.sql
```

Verify the migration was applied:
```bash
docker-compose exec postgres psql -U fireisp fireisp -c "SELECT * FROM schema_migrations WHERE version = '005';"
```

### Step 4: Restart Backend

Restart the backend to ensure it picks up the latest code:
```bash
docker-compose restart backend
```

### Step 5: Test the Fix

1. **Test Payments Page:**
   - Go to the Payments page
   - Click "Register Payment"
   - Select a client
   - Verify that unpaid invoices load without errors

2. **Test Client Dashboard:**
   - Go to a client's dashboard
   - Verify that invoices load in the Recent Invoices section

## What the Fix Does

### Before:
- If `amount_paid` column was missing, the query would fail completely
- Generic error message: "Failed to get unpaid invoices"
- No information about what went wrong
- Users were stuck without a solution

### After:
- If `amount_paid` column is missing, the system falls back to using invoice totals
- Detailed error logging for debugging
- Clear error messages with details in development mode
- System continues to work even if migrations are not applied (with reduced functionality)
- Provides actionable information on how to fix the issue

## Benefits

1. **Improved Reliability**: System degrades gracefully if migrations are missing
2. **Better Diagnostics**: Clear error messages help identify the problem quickly
3. **Self-Service**: Users can diagnose and fix the issue themselves using the provided tools
4. **Backward Compatibility**: Works with databases that don't have the latest migrations
5. **Developer-Friendly**: Enhanced logging makes debugging easier

## Additional Tools

### Database Schema Checker

A new diagnostic tool is available to check your database schema:

```bash
node backend/scripts/check-db-schema.js
```

This will:
- ✅ Check if all required columns exist
- ✅ Verify required tables are present
- ✅ Test actual queries to ensure they work
- 📊 Provide a summary of passed/failed checks
- 💡 Suggest how to fix any issues found

### Migration Diagnostic Tool

The existing migration diagnostic tool has been improved:

```bash
sudo bash database/check-migrations.sh
```

This will:
- Check which migrations have been applied
- Identify pending migrations
- Offer to apply missing migrations automatically
- Verify critical tables and columns

## Troubleshooting

### If the error persists after applying this fix:

1. **Check Backend Logs:**
   ```bash
   docker-compose logs backend | tail -50
   ```

2. **Verify Database Connection:**
   ```bash
   docker-compose exec postgres psql -U fireisp fireisp -c "SELECT current_database();"
   ```

3. **Check Invoices Table Schema:**
   ```bash
   docker-compose exec postgres psql -U fireisp fireisp -c "\d invoices"
   ```
   Look for the `amount_paid` column

4. **Run Schema Checker:**
   ```bash
   node backend/scripts/check-db-schema.js
   ```

### If you see "amount_paid column may not exist, using fallback query":

This is a warning, not an error. The system is working but with reduced functionality. To get full functionality:

1. Apply migration 005 as described above
2. Restart the backend
3. The warning should disappear

## Related Issues

This fix addresses the issue where users get "Failed to load client data: Failed to get unpaid invoices" when:
- The payment system migrations haven't been applied
- The database schema is incomplete
- There's a database connection issue

## Files Changed

- `backend/src/routes/payments.js` - Added fallback logic and better error handling
- `frontend/src/pages/Payments.jsx` - Enhanced error display
- `frontend/src/pages/ClientDashboard.jsx` - Improved error logging
- `backend/scripts/check-db-schema.js` - New database schema checker tool
- `TROUBLESHOOTING_PAYMENTS_SERVICES.md` - Updated documentation

## Testing

To test that this fix works correctly:

1. **Without Migration 005:**
   - The system should use the fallback query
   - You should see a console warning about "amount_paid column may not exist"
   - Unpaid invoices should still load (showing full invoice totals)

2. **With Migration 005:**
   - The system should use the primary query
   - No warnings should appear
   - Unpaid invoices show accurate amounts due (total - amount_paid)

3. **Error Cases:**
   - Database connection errors are properly logged
   - Users see meaningful error messages
   - Development mode shows detailed error information
