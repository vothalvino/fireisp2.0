# Payment Registration System Testing Guide

This document provides a comprehensive guide for testing the new payment registration system.

## Prerequisites

1. FireISP 2.0 is installed and running
2. Database is accessible
3. At least one client exists in the system
4. Some invoices exist for testing

## Database Migration

### Apply Migration

Run the migration to add the payment system tables and columns:

```bash
# If using Docker
docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/005_add_payment_system.sql

# Record migration
docker-compose exec postgres psql -U fireisp -c "INSERT INTO schema_migrations (version, applied_at) VALUES ('005', NOW()) ON CONFLICT DO NOTHING;"

# Or use the update script
sudo ./update.sh
```

### Verify Migration

Check that the tables and columns were created:

```sql
-- Check clients table has credit_balance column
SELECT credit_balance FROM clients LIMIT 1;

-- Check payments table structure
\d payments

-- Check payment_allocations table exists
\d payment_allocations

-- Check invoices table has amount_paid column
SELECT amount_paid FROM invoices LIMIT 1;

-- Check triggers were created
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%allocation%';
```

## Backend Testing

### 1. Start the Backend Server

```bash
# Development mode
cd backend
npm run dev

# Or with Docker
docker-compose up backend
```

### 2. API Endpoint Testing

Use curl or Postman to test the endpoints:

#### Get Client's Unpaid Invoices

```bash
curl -X GET http://localhost:3000/api/payments/client/{CLIENT_ID}/unpaid-invoices \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get Client Credit Balance

```bash
curl -X GET http://localhost:3000/api/payments/client/{CLIENT_ID}/credit \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Register Payment with Multiple Invoices

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "CLIENT_UUID",
    "amount": 250.00,
    "paymentDate": "2024-01-09",
    "paymentMethod": "cash",
    "transactionId": "TXN12345",
    "notes": "Test payment",
    "invoiceAllocations": [
      {
        "invoiceId": "INVOICE_UUID_1",
        "amount": 100.00
      },
      {
        "invoiceId": "INVOICE_UUID_2",
        "amount": 100.00
      }
    ]
  }'
```

#### Register Payment Without Invoices (Direct Credit)

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "CLIENT_UUID",
    "amount": 100.00,
    "paymentDate": "2024-01-09",
    "paymentMethod": "bank_transfer",
    "notes": "Direct credit payment"
  }'
```

#### Get Payment History

```bash
curl -X GET http://localhost:3000/api/payments/client/{CLIENT_ID}/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Frontend Testing

### 1. Access the Payments Page

1. Log in to FireISP
2. Navigate to the "Payments" menu item in the sidebar
3. You should see the payments management page

### 2. Test Payment Registration Flow

#### Test Case 1: Payment for Multiple Invoices

1. Click "Register Payment" button
2. Select a client from the dropdown
3. Wait for unpaid invoices to load
4. Verify all invoices are selected by default
5. Verify the payment amount equals the sum of selected invoices
6. Click "Register Payment"
7. Verify success message appears
8. Check that invoices are marked as paid/partial in the database

#### Test Case 2: Partial Invoice Payment

1. Click "Register Payment"
2. Select a client with unpaid invoices
3. Uncheck some invoices
4. Adjust the payment amount for one invoice to be less than the full amount
5. Verify payment summary shows correct totals
6. Submit the payment
7. Verify partial payment is recorded

#### Test Case 3: Overpayment (Credit Conversion)

1. Click "Register Payment"
2. Select a client with unpaid invoices
3. Keep all invoices selected
4. Edit the payment amount to be MORE than the total
5. Verify the "Will be added as Credit" shows the difference
6. Verify "New Credit Balance" is calculated correctly
7. Submit the payment
8. Check database to confirm credit was added

#### Test Case 4: Payment Without Invoices (Direct Credit)

1. Click "Register Payment"
2. Select a client with NO unpaid invoices
3. Enter a payment amount
4. Verify message shows payment will be added as credit
5. Submit the payment
6. Check database to confirm credit was added

#### Test Case 5: Unselect All Invoices

1. Click "Register Payment"
2. Select a client with unpaid invoices
3. Uncheck all invoices
4. Enter a payment amount
5. Verify payment will go to credit
6. Submit the payment

### 3. UI/UX Verification

- [ ] Current credit balance is displayed prominently
- [ ] Selected invoices are highlighted with green border
- [ ] Unselected invoices have gray background
- [ ] Payment summary updates in real-time
- [ ] Amounts are formatted as currency (2 decimal places)
- [ ] Invoice selection checkboxes work properly
- [ ] Amount fields are disabled for unselected invoices
- [ ] Payment method dropdown has all options
- [ ] Validation messages appear for invalid input
- [ ] Success messages are clear and informative

## Database Verification

After each test, verify the database state:

### Check Payment Record

```sql
SELECT * FROM payments 
WHERE client_id = 'CLIENT_UUID' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Check Payment Allocations

```sql
SELECT pa.*, i.invoice_number 
FROM payment_allocations pa
JOIN invoices i ON pa.invoice_id = i.id
WHERE pa.payment_id = 'PAYMENT_UUID';
```

### Check Invoice Status and Amount Paid

```sql
SELECT 
    invoice_number,
    total,
    amount_paid,
    (total - amount_paid) as amount_due,
    status
FROM invoices
WHERE client_id = 'CLIENT_UUID';
```

### Check Client Credit Balance

```sql
SELECT 
    client_code,
    company_name,
    credit_balance
FROM clients
WHERE id = 'CLIENT_UUID';
```

### Check Trigger Functionality

After making a payment, verify triggers updated invoice status:

```sql
-- Should show 'paid' for fully paid invoices
-- Should show 'partial' for partially paid invoices
SELECT invoice_number, status, amount_paid, total
FROM invoices
WHERE id = 'INVOICE_UUID';
```

## Test Scenarios Summary

| Test # | Scenario | Expected Result |
|--------|----------|-----------------|
| 1 | Single invoice full payment | Invoice status = 'paid', amount_paid = total |
| 2 | Multiple invoices full payment | All invoices status = 'paid' |
| 3 | Partial payment on single invoice | Invoice status = 'partial', amount_paid < total |
| 4 | Overpayment | Invoices paid, excess added to credit |
| 5 | Payment without invoices | Full amount added to client credit |
| 6 | Select/unselect invoices | Only selected invoices are paid |
| 7 | Edit invoice amounts | Custom amounts allocated correctly |
| 8 | Zero amount invoices | Ignored in allocation |
| 9 | Payment date in past | Accepted and recorded |
| 10 | Different payment methods | Method stored correctly |

## Common Issues & Troubleshooting

### Issue: Migration fails with "column already exists"

**Solution:** The migration uses `IF NOT EXISTS` clauses, so it should be safe to run multiple times. If it still fails, check if the columns were partially created and manually complete the migration.

### Issue: Triggers not firing

**Solution:** Check trigger creation:
```sql
SELECT * FROM pg_trigger WHERE tgrelid = 'payment_allocations'::regclass;
```

### Issue: Credit balance not updating

**Solution:** Verify the payment registration logic and check the payments table for the correct client_id.

### Issue: Invoice status not updating

**Solution:** Check that payment_allocations are being created and triggers are active.

## Performance Testing

For production environments, test with realistic data volumes:

1. Create 100+ clients
2. Create 1000+ invoices
3. Register 500+ payments
4. Measure query response times
5. Check for any slow queries in database logs

## Security Testing

- [ ] Ensure authentication is required for all endpoints
- [ ] Verify users can only access their authorized clients
- [ ] Test SQL injection attempts (should be prevented by parameterized queries)
- [ ] Verify amount validations (no negative amounts, etc.)
- [ ] Test concurrent payment registrations for same invoice

## Acceptance Criteria Checklist

- [x] Can register payment for single invoice
- [x] Can register payment for multiple invoices
- [x] Can partially pay invoices
- [x] Overpayment converts to credit
- [x] Can register payment without invoices (direct credit)
- [x] Selected invoices default to checked
- [x] Can unselect invoices
- [x] Payment amount is editable
- [x] Invoice amounts are editable per invoice
- [x] Payment summary shows correct calculations
- [x] Credit balance is displayed
- [x] Invoice status updates automatically
- [x] Payment history is accessible

## Rollback Procedure

If issues are found and rollback is needed:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS trigger_update_invoice_on_allocation_insert ON payment_allocations;
DROP TRIGGER IF EXISTS trigger_update_invoice_on_allocation_update ON payment_allocations;
DROP TRIGGER IF EXISTS trigger_update_invoice_on_allocation_delete ON payment_allocations;

-- Drop function
DROP FUNCTION IF EXISTS update_invoice_payment_status();

-- Drop table
DROP TABLE IF EXISTS payment_allocations;

-- Remove columns
ALTER TABLE invoices DROP COLUMN IF EXISTS amount_paid;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS check_payment_reference;
ALTER TABLE payments DROP COLUMN IF EXISTS client_id;
ALTER TABLE clients DROP COLUMN IF EXISTS credit_balance;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '005';
```

## Next Steps

After successful testing:

1. Document any issues found
2. Fix critical bugs
3. Update user documentation
4. Train support staff on new feature
5. Deploy to production
6. Monitor for issues in production

## Notes

- Payment allocations are stored in a separate table for better tracking
- Triggers automatically update invoice status and amount_paid
- The system handles edge cases like zero amounts and negative amounts
- Credit balance can be used for future invoice payments (future enhancement)
