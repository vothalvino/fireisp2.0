# Payment Registration System - Feature Summary

## Overview

This feature adds a comprehensive payment registration system to FireISP 2.0, allowing flexible payment processing with support for:
- Multiple invoice payments in a single transaction
- Partial invoice payments
- Overpayment conversion to client credit
- Direct credit payments (without invoices)
- Automatic invoice status updates

## Problem Solved

Previously, the system only supported recording payments for individual invoices. The new system addresses the following real-world scenarios:

1. **Client pays for multiple invoices at once** - Common when clients settle multiple outstanding bills
2. **Client overpays** - Excess amount is automatically converted to credit for future use
3. **Client wants to add credit** - Can register payment without selecting any invoices
4. **Partial payments** - Clients can pay less than the full invoice amount
5. **Flexible invoice selection** - Staff can choose which invoices to apply payment to

## Architecture

### Database Layer

**New Tables:**
- `payment_allocations` - Tracks which invoices were paid by each payment

**Modified Tables:**
- `clients` - Added `credit_balance` field
- `payments` - Added `client_id` field (invoice_id now optional)
- `invoices` - Added `amount_paid` field for tracking

**Triggers:**
- Automatic invoice status updates when payments are allocated
- Automatic `amount_paid` calculations
- Status changes: pending → partial → paid

### Backend API

**New Endpoints:**
```
GET  /api/payments/client/:clientId/unpaid-invoices
GET  /api/payments/client/:clientId/credit
POST /api/payments
GET  /api/payments/client/:clientId/history
GET  /api/payments/:id
GET  /api/payments
```

**Key Features:**
- Parameterized queries for SQL injection protection
- Transaction support for data integrity
- Validation of payment amounts and allocations
- Automatic credit calculation and application

### Frontend UI

**New Page: `/payments`**
- Clean, intuitive interface for payment registration
- Real-time calculation of totals and credit
- Visual feedback for selected/unselected invoices
- Client selection with automatic data loading
- Multiple payment methods support

**Integration:**
- Added to main navigation menu
- Quick access button on Invoices page
- Consistent with existing FireISP UI patterns

## User Workflow

### Scenario 1: Paying Multiple Invoices

1. Navigate to Payments page
2. Click "Register Payment"
3. Select client from dropdown
4. System loads unpaid invoices (all selected by default)
5. Review selected invoices and amounts
6. Optionally adjust payment amounts
7. Enter payment details (method, date, reference)
8. Submit payment
9. System allocates payment and updates invoice status

### Scenario 2: Overpayment

1. Follow steps 1-6 from Scenario 1
2. Edit payment amount to be more than invoice total
3. System shows:
   - Amount to be applied to invoices
   - Amount to be added as credit
   - New credit balance
4. Submit payment
5. Invoices are paid and excess goes to credit

### Scenario 3: Direct Credit Payment

1. Navigate to Payments page
2. Click "Register Payment"
3. Select client with no unpaid invoices
4. System shows message: "No unpaid invoices. Payment will be added as credit."
5. Enter payment amount and details
6. Submit payment
7. Full amount added to client credit

### Scenario 4: Selective Payment

1. Follow steps 1-4 from Scenario 1
2. Uncheck invoices that should not be paid
3. System recalculates total
4. Optionally adjust overall payment amount
5. Submit payment
6. Only selected invoices are paid

## Technical Details

### Payment Allocation Logic

```javascript
// Pseudocode for payment allocation
for each selected invoice:
  calculate amount_due = invoice.total - invoice.amount_paid
  allocate_amount = min(allocation.amount, amount_due)
  create payment_allocation record
  total_allocated += allocate_amount

remaining_amount = payment.amount - total_allocated
if remaining_amount > 0:
  add to client.credit_balance
```

### Invoice Status Updates (via Trigger)

```sql
status = CASE
  WHEN amount_paid >= total THEN 'paid'
  WHEN amount_paid > 0 THEN 'partial'
  ELSE current_status
END
```

### Data Integrity

- Transactions ensure atomic operations
- Triggers maintain consistency
- Constraints prevent invalid data:
  - Positive allocation amounts
  - Either invoice_id or client_id must be set
  - Credit balance cannot be negative (via application logic)

## UI Components

### Payment Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Client | Dropdown | Yes | Select client for payment |
| Payment Date | Date | Yes | Date payment was received |
| Payment Method | Dropdown | Yes | cash, check, bank_transfer, etc. |
| Payment Amount | Number | Yes | Total amount being paid |
| Transaction ID | Text | No | Reference number |
| Notes | Textarea | No | Additional information |

### Invoice Selection

Each unpaid invoice shows:
- Checkbox for selection
- Invoice number and due date
- Current status
- Amount due
- Editable payment amount field

Visual indicators:
- Green border for selected invoices
- Gray background for unselected invoices
- Disabled amount field for unselected invoices

### Payment Summary

Real-time display of:
- Selected invoices total
- Payment amount
- Credit amount (if any)
- New credit balance

## Security Considerations

✅ Authentication required for all endpoints
✅ Parameterized SQL queries prevent injection
✅ Input validation on amounts and references
✅ Transaction support prevents partial updates
✅ Audit trail via created_at timestamps

## Performance Considerations

- Indexed foreign keys for fast lookups
- Pagination support for payment history
- Efficient queries with proper JOINs
- Trigger-based updates avoid application overhead

## Future Enhancements

The following features could be added in future versions:

1. **Use Credit for Invoice Payments** - Apply existing credit to new invoices
2. **Payment Receipts** - Generate PDF receipts
3. **Email Notifications** - Send receipt via email
4. **Payment Plans** - Schedule recurring payments
5. **Refunds** - Reverse payments and adjust credit
6. **Payment Import** - Bulk import from CSV/Excel
7. **Payment Reports** - Analytics and insights
8. **Multi-Currency Support** - Handle different currencies
9. **Payment Gateway Integration** - Accept online payments
10. **Credit Expiry** - Set expiration dates for credits

## Migration Path

For existing installations:

1. Run database migration: `005_add_payment_system.sql`
2. Restart backend service
3. Clear browser cache and refresh frontend
4. Test with a non-production client first

Existing payment records remain intact and functional.

## Testing Checklist

- [x] Database migration runs successfully
- [x] Backend endpoints respond correctly
- [x] Frontend loads without errors
- [x] Can register payment for single invoice
- [x] Can register payment for multiple invoices
- [x] Partial payments work correctly
- [x] Overpayment converts to credit
- [x] Direct credit payment works
- [x] Invoice status updates automatically
- [x] Payment history displays correctly
- [x] Validation prevents invalid data
- [x] UI is responsive and intuitive

## Documentation

- `PAYMENT_SYSTEM_TESTING.md` - Comprehensive testing guide
- Backend API documentation (inline comments)
- Frontend component documentation (inline comments)
- Database schema documentation (migration file)

## Code Quality

- ✅ Follows existing codebase patterns
- ✅ Uses parameterized queries
- ✅ Includes error handling
- ✅ Proper transaction management
- ✅ Consistent naming conventions
- ✅ Comprehensive comments
- ✅ Idempotent migration

## Support & Maintenance

**Common Issues:**

1. **Migration fails** - Check if tables already exist, use IF NOT EXISTS clauses
2. **Credit not updating** - Verify payment has client_id set
3. **Invoice status not changing** - Check triggers are created and active

**Debugging:**

```sql
-- Check payment allocations
SELECT * FROM payment_allocations 
WHERE payment_id = 'xxx';

-- Check invoice amounts
SELECT invoice_number, total, amount_paid, status 
FROM invoices 
WHERE client_id = 'xxx';

-- Check client credit
SELECT client_code, credit_balance 
FROM clients 
WHERE id = 'xxx';
```

## License & Credits

This feature is part of FireISP 2.0, licensed under MIT.

Developed to meet real-world ISP billing requirements.

## Changelog

### Version 2.0.0 (2024-01-09)
- ✨ Initial release of payment registration system
- ✨ Multi-invoice payment support
- ✨ Credit balance management
- ✨ Automatic invoice status updates
- ✨ Payment history tracking
- 📝 Comprehensive testing documentation

## Contact & Support

For issues or questions about this feature:
1. Check `PAYMENT_SYSTEM_TESTING.md` for troubleshooting
2. Review inline code comments
3. Open a GitHub issue with details
