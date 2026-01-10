# Recurring Invoice System

This feature enables automatic generation of recurring invoices for active services in FireISP.

## Overview

The recurring invoice system allows you to:
- Set default billing day and payment terms at the company level
- Optionally customize billing settings per service
- Automatically generate invoices for active services
- Track when each service was last invoiced

## Configuration

### Company-Level Default Settings

Navigate to **Settings → Company** tab to configure:

- **Default Billing Day (1-28)**: The day of the month when recurring invoices are generated for services without custom settings
- **Default Days to Pay**: Number of days from invoice date until payment is due

These settings apply to all services that don't have custom billing configuration.

### Per-Service Custom Settings

When creating or editing a service in **Services** page:

1. Enable **Recurring Billing** checkbox to activate automatic invoicing for the service
2. Choose whether to use company default settings or customize:
   - **Use company default billing settings**: Uses the default values from company settings
   - **Custom settings**: Set a specific billing day and days until due for this service

**Example scenarios:**
- Most services bill on day 1: Set default billing day to 1
- One special client wants billing on day 15: Enable custom settings and set billing day to 15
- Standard payment term is 15 days, but premium clients get 30 days: Set custom days until due

## Generating Invoices

### Manual Generation

In the **Services** page, click the **Generate Invoices** button to manually trigger invoice generation for all eligible services.

The system will:
1. Check all active services with recurring billing enabled
2. Determine if it's the billing day for each service
3. Skip services already invoiced this month
4. Create invoices with appropriate due dates
5. Display a summary of created invoices

### Automatic Generation (Recommended)

For production use, set up a daily cron job to automatically generate invoices:

```bash
# Edit crontab
crontab -e

# Add this line to run daily at 2 AM
0 2 * * * cd /path/to/fireisp2.0/backend && node scripts/generate-recurring-invoices.js >> /var/log/fireisp-invoices.log 2>&1
```

The script will:
- Run daily and check if any services need invoicing
- Only create invoices on the appropriate billing day for each service
- Prevent duplicate invoices for the same month
- Log all actions to help with troubleshooting

#### Docker Setup

If running in Docker, you can:

1. **Add to backend container's entrypoint:**
```dockerfile
# Add cron package to Dockerfile
RUN apt-get update && apt-get install -y cron

# Add crontab entry
RUN echo "0 2 * * * cd /app && node scripts/generate-recurring-invoices.js >> /var/log/fireisp-invoices.log 2>&1" | crontab -

# Start cron in entrypoint
CMD cron && node server.js
```

2. **Or use host cron with docker exec:**
```bash
# Add to host crontab
0 2 * * * docker exec fireisp-backend node /app/scripts/generate-recurring-invoices.js >> /var/log/fireisp-invoices.log 2>&1
```

## Invoice Logic

### When Are Invoices Generated?

An invoice is generated for a service when **all** of these conditions are met:

1. Service status is `active`
2. Recurring billing is enabled for the service
3. Either:
   - It's the billing day for that service (default or custom), OR
   - The service has never been invoiced before

4. The service hasn't been invoiced yet this month

### Billing Day Matching

- Services are only invoiced on their designated billing day
- Default billing day: Set in company settings
- Custom billing day: Set per service (1-28)
- Day 29-31 are not supported to avoid month-end issues

**Example:** If a service has billing day set to 15:
- On the 15th of each month, an invoice will be generated
- On other days, the service is skipped
- If already invoiced on the 15th, no duplicate is created

### Invoice Details

Generated invoices include:
- **Invoice Number**: Auto-generated sequential number (INV-YYYY-#####)
- **Issue Date**: Current date when invoice is generated
- **Due Date**: Issue date + days until due (default or custom)
- **Line Item**: Service plan name with billing cycle
- **Amount**: Plan price (tax can be configured later)
- **Status**: Pending (until payment is recorded)

## Database Schema

### New Fields in `client_services`

- `billing_day_of_month` (INTEGER): Custom billing day (1-28), NULL uses default
- `days_until_due` (INTEGER): Custom payment term, NULL uses default
- `recurring_billing_enabled` (BOOLEAN): Whether to generate invoices (default: true)
- `last_invoice_date` (DATE): When the last invoice was created

### New Settings in `system_settings`

- `default_billing_day`: Company default billing day (1-28)
- `default_days_to_pay`: Company default payment term (days)

## API Endpoints

### Generate Recurring Invoices
```
POST /api/services/generate-recurring-invoices
```

Manually triggers invoice generation for all eligible services.

**Response:**
```json
{
  "success": true,
  "message": "Generated 5 recurring invoice(s)",
  "invoices": [
    {
      "invoiceNumber": "INV-2024-00001",
      "clientName": "Acme Corp",
      "serviceName": "Premium 100Mbps",
      "amount": 99.99
    }
  ]
}
```

## Troubleshooting

### No Invoices Generated

**Check:**
1. Services have `recurring_billing_enabled = true`
2. Services are `active` status
3. Current day matches billing day (default or custom)
4. Service hasn't been invoiced this month already
5. Default billing settings are configured in company settings

### Duplicate Invoices

The system prevents duplicates by:
- Tracking `last_invoice_date` per service
- Only invoicing once per month per service
- Checking year and month before creating invoice

If duplicates occur, check the cron schedule isn't running multiple times per day.

### Wrong Due Date

Verify:
- Company default `default_days_to_pay` setting
- Service-specific `days_until_due` if custom settings are enabled

### Script Errors

Check logs:
```bash
# View cron logs
tail -f /var/log/fireisp-invoices.log

# Check cron is running
systemctl status cron

# Test script manually
cd /path/to/fireisp2.0/backend
node scripts/generate-recurring-invoices.js
```

## Future Enhancements

Potential improvements:
- Email notifications when invoices are generated
- Support for tax calculation
- Proration for partial months
- Multiple billing cycles per service
- Invoice templates customization
- Automatic payment reminders
