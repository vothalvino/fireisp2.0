# Recurring Invoice Feature - Implementation Summary

## Overview
This implementation adds automatic recurring invoice generation to FireISP 2.0, allowing ISPs to automatically bill customers for their active services on a scheduled basis.

## Features Implemented

### 1. Company-Wide Default Settings
- **Location**: Settings → Company tab
- **Fields**:
  - `default_billing_day` (1-28): Day of month when invoices are generated
  - `default_days_to_pay` (1-90): Payment term in days
- Services without custom settings use these defaults

### 2. Per-Service Custom Settings
- **Location**: Services → Add/Edit Service form
- **Options**:
  - Enable/disable recurring billing per service
  - Choose to use company defaults or set custom values
  - Custom billing day (1-28)
  - Custom payment terms (1-90 days)
- Gives flexibility for special client arrangements

### 3. Automatic Invoice Generation
- **Manual Trigger**: "Generate Invoices" button on Services page
- **Automatic Trigger**: Cron job running daily
- **Logic**:
  - Only generates for active services with recurring billing enabled
  - Respects each service's billing day (default or custom)
  - Prevents duplicate invoices for same month
  - Tracks last invoice date per service

### 4. Invoice Details
- **Invoice Number Format**: `INV-{year}-{timestamp}-{serviceId}`
  - Prevents race conditions
  - Ensures uniqueness
- **Contents**:
  - Issue date: Generation date
  - Due date: Issue date + days until due
  - Line item: Service plan description
  - Amount: Service plan price
  - Status: Pending

## Technical Implementation

### Database Changes
**New columns in `client_services`:**
- `billing_day_of_month` INTEGER (1-28, nullable)
- `days_until_due` INTEGER (1-90, nullable)
- `recurring_billing_enabled` BOOLEAN (default: true)
- `last_invoice_date` DATE

**New system settings:**
- `default_billing_day`: Company default (default: 1)
- `default_days_to_pay`: Company default (default: 15)

**Constraints:**
- `billing_day_of_month` CHECK: 1-28 or NULL
- `days_until_due` CHECK: 1-90 or NULL
- Index on `recurring_billing_enabled` and `status` for performance

### Backend API
**New Endpoint:**
```
POST /api/services/generate-recurring-invoices
```

**Response:**
```json
{
  "success": true,
  "message": "Generated N recurring invoice(s)",
  "invoices": [
    {
      "invoiceNumber": "INV-2024-123456-abc123de",
      "clientName": "Example Corp",
      "serviceName": "Premium 100Mbps",
      "amount": 99.99
    }
  ]
}
```

### Frontend Updates
**Settings.jsx:**
- Added billing configuration section to Company tab
- Fields for default billing day and days to pay
- Help text explaining each setting

**Services.jsx:**
- Added "Generate Invoices" button
- Added recurring billing configuration section in service form
- Toggle for enabling/disabling recurring billing
- Option to use defaults or set custom values
- Validation for billing day (1-28) and payment terms

**api.js:**
- Added `generateRecurringInvoices()` method to serviceService

### Scripts
**generate-recurring-invoices.js:**
- Standalone Node.js script for cron execution
- Connects directly to PostgreSQL database
- Implements same logic as API endpoint
- Detailed logging for troubleshooting
- Proper error handling and cleanup

**test-recurring-invoices.js:**
- Validates database schema
- Checks for required columns and settings
- Tests invoice generation query
- Useful for troubleshooting setup

## Installation & Setup

### 1. Apply Database Migration
```bash
# Using docker
docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/006_add_recurring_invoices.sql

# Or wait for automatic migration on next update.sh run
```

### 2. Configure Default Settings
1. Navigate to Settings → Company
2. Set Default Billing Day (e.g., 1 for 1st of month)
3. Set Default Days to Pay (e.g., 15 for 15 days payment term)
4. Save settings

### 3. Configure Services
1. Navigate to Services
2. Edit existing services or create new ones
3. Enable "Recurring Billing" checkbox
4. Choose default or custom billing settings
5. Save

### 4. Test Manual Generation
1. Click "Generate Invoices" button on Services page
2. Verify invoices are created correctly
3. Check Invoices page for new entries

### 5. Setup Automatic Generation (Recommended)
```bash
# Edit crontab
crontab -e

# Add daily execution at 2 AM
0 2 * * * cd /path/to/fireisp2.0/backend && node scripts/generate-recurring-invoices.js >> /var/log/fireisp-invoices.log 2>&1

# Or for Docker
0 2 * * * docker exec fireisp-backend node /app/scripts/generate-recurring-invoices.js >> /var/log/fireisp-invoices.log 2>&1
```

## Usage Examples

### Example 1: Standard Monthly Billing
- **Scenario**: Bill all customers on the 1st of each month
- **Setup**:
  - Default billing day: 1
  - Default days to pay: 15
  - All services use default settings
- **Result**: Every 1st of month, invoices are generated with due date on 16th

### Example 2: Mixed Billing Days
- **Scenario**: Most customers on 1st, premium customers on 15th
- **Setup**:
  - Default billing day: 1
  - Premium services: Custom billing day 15
- **Result**: 
  - 1st of month: Standard customer invoices
  - 15th of month: Premium customer invoices

### Example 3: Varied Payment Terms
- **Scenario**: Standard 15 days, VIP clients get 30 days
- **Setup**:
  - Default days to pay: 15
  - VIP services: Custom days until due 30
- **Result**: 
  - Standard: Invoices due in 15 days
  - VIP: Invoices due in 30 days

## Monitoring & Troubleshooting

### Check Logs
```bash
# View cron execution logs
tail -f /var/log/fireisp-invoices.log

# Check for errors
grep -i error /var/log/fireisp-invoices.log
```

### Test Database Schema
```bash
cd /path/to/fireisp2.0/backend
node scripts/test-recurring-invoices.js
```

### Manual Test Run
```bash
cd /path/to/fireisp2.0/backend
node scripts/generate-recurring-invoices.js
```

### Common Issues

**No invoices generated:**
- Verify services have `recurring_billing_enabled = true`
- Check services are `active` status
- Ensure current day matches billing day
- Confirm services haven't been invoiced this month

**Wrong billing day:**
- Check service custom settings in database
- Verify default settings in Settings page
- Ensure migration applied correctly

**Duplicate invoices:**
- Check cron isn't running multiple times
- Verify `last_invoice_date` is being updated
- Ensure transaction is completing successfully

## Future Enhancements

Potential additions for future versions:
- [ ] Tax calculation configuration
- [ ] Email notifications when invoices are generated
- [ ] Invoice templates customization
- [ ] Proration for partial months
- [ ] Multiple billing cycles per service
- [ ] Automatic payment reminders
- [ ] Integration with payment gateways
- [ ] Billing reports and analytics
- [ ] Grace periods and late fees

## Security Considerations

1. **API Authentication**: Endpoint requires valid JWT token
2. **Database Constraints**: Validates billing day and payment term ranges
3. **Transaction Safety**: Uses database transactions for atomicity
4. **Race Condition Prevention**: Unique invoice numbers using timestamp+ID
5. **Duplicate Prevention**: Tracks last invoice date per service

## Performance Notes

- Index on `recurring_billing_enabled` and `status` for fast queries
- Batch processing within a single transaction
- Efficient date comparisons using EXTRACT
- Minimal database queries per service

## Testing Checklist

- [x] Database migration applies cleanly
- [x] Settings UI displays and saves correctly
- [x] Service form shows billing options
- [x] Manual invoice generation works
- [x] Invoices have correct dates and amounts
- [x] Duplicate prevention works
- [x] Custom billing days respected
- [x] Custom payment terms applied
- [ ] Cron job executes successfully
- [ ] Email notifications (future)
- [ ] Performance with 1000+ services (needs testing)

## Documentation

- **User Guide**: RECURRING_INVOICES.md
- **Database Schema**: database/migrations/006_add_recurring_invoices.sql
- **API Documentation**: Included in this file
- **Cron Setup**: RECURRING_INVOICES.md

## Support

For issues or questions:
1. Check RECURRING_INVOICES.md for detailed guide
2. Run test-recurring-invoices.js to validate setup
3. Review logs for error messages
4. Check database for correct configuration

## Version Information

- **Feature Version**: 1.0
- **Compatible with**: FireISP 2.0
- **Migration Number**: 006
- **Date**: January 2024
