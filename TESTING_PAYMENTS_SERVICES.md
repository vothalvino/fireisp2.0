# Testing Guide: Services and Payments

This guide helps you test service and payment creation after applying the fixes.

## Prerequisites

Before testing, ensure:

1. All database migrations are applied:
   ```bash
   sudo bash database/check-migrations.sh
   ```

2. All containers are running:
   ```bash
   docker-compose ps
   ```
   You should see `backend`, `postgres`, `frontend`, and `nginx` containers running.

3. You can access the application:
   - Open your browser and navigate to your FireISP URL
   - Login with your credentials

## Test 1: Service Creation

### Step 1: Verify Prerequisites

Before creating a service, ensure you have:
- At least one client created
- At least one service plan configured
- Access to the Services page

### Step 2: Create a Service

1. Navigate to **Services** page
2. Click **"Add Service"** button
3. Fill in the form:
   - **Client**: Select an existing client
   - **Service Plan**: Select a plan
   - **Username**: Leave empty for auto-generation OR enter a unique username
   - **Password**: Leave empty for auto-generation OR enter a password
   - **IP Address**: (Optional) Enter an IP address
   - **MAC Address**: (Optional) Enter a MAC address
   - **Activation Date**: Select today's date
   - **Expiration Date**: Either:
     - Check "No Expiration (Indefinite)" for services without expiry
     - OR select a future date
   - **Recurring Billing Enabled**: Check this box
   - **Use company default billing settings**: Check this box OR
     - Uncheck and enter custom billing day (1-28)
     - Enter custom days until due (1-90)
   - **Notes**: (Optional) Add any notes

4. Click **"Create Service"**

### Expected Result

- ✅ Success message: "Service created successfully"
- ✅ New service appears in the Client Services table
- ✅ Service has status "active"
- ✅ Username and password are displayed (if auto-generated)

### Common Issues

❌ **Error: "Failed to create client service"**
- Check backend logs: `docker-compose logs backend | tail -20`
- Verify migration 006 is applied: `bash database/check-migrations.sh`

❌ **Error: "Username already exists"**
- Try a different username
- OR leave username field empty to auto-generate

❌ **Error: "column recurring_billing_enabled does not exist"**
- Migration 006 not applied
- Run: `docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/006_add_recurring_invoices.sql`

## Test 2: Service Plan Creation

### Step 1: Create a Service Plan

1. Navigate to **Services** page
2. In the "Service Plans" section, click **"Add Plan"**
3. Fill in the form:
   - **Service Type**: Select Internet, IPTV, VoIP, or other
   - **Plan Name**: e.g., "Basic 10Mbps"
   - **Description**: (Optional) Plan details
   - **Download Speed**: e.g., "10 Mbps"
   - **Upload Speed**: e.g., "5 Mbps"
   - **Price**: e.g., 29.99
   - **Billing Cycle**: Select monthly, quarterly, semi-annual, or annual

4. Click **"Create Plan"**

### Expected Result

- ✅ Success message: "Service plan created successfully"
- ✅ New plan appears in the Service Plans table
- ✅ Plan is available when creating services

## Test 3: Payment Registration

### Step 1: Create Test Invoices (Optional)

Before testing payments, you may want to create some test invoices:

1. Navigate to **Invoices** page
2. Create 1-2 test invoices for a client
3. Keep them in "pending" status

### Step 2: Register a Payment

1. Navigate to **Payments** page
2. Click **"Register Payment"** button
3. Fill in the form:
   - **Client**: Select a client
   - **Payment Date**: Select today's date
   - **Payment Method**: Select cash, check, bank transfer, etc.
   - **Transaction ID**: (Optional) Enter a reference number

4. After selecting a client:
   - View their current credit balance
   - See list of unpaid invoices (if any)
   - By default, all invoices are selected with full amounts

5. Adjust as needed:
   - Uncheck invoices you don't want to pay
   - Adjust payment amounts for specific invoices
   - The total payment amount updates automatically

6. Review the Payment Summary:
   - Selected Invoices Total
   - Payment Amount
   - Credit to be added (if payment > invoices)
   - New Credit Balance

7. **Notes**: (Optional) Add payment notes

8. Click **"Register Payment"**

### Expected Result

- ✅ Success message showing:
  - Payment amount
  - Amount allocated to invoices
  - Credit added (if any)
  - New credit balance
- ✅ Invoices are updated to "paid" or "partial" status
- ✅ Client credit balance is updated
- ✅ Payment appears in payment history

### Common Issues

❌ **Error: "Failed to register payment"**
- Check backend logs: `docker-compose logs backend | tail -20`
- Verify migration 005 is applied: `bash database/check-migrations.sh`

❌ **Error: "payment_allocations does not exist"**
- Migration 005 not applied
- Run: `docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/005_add_payment_system.sql`

❌ **Error: "Client ID, amount, payment date, and payment method are required"**
- Ensure all required fields are filled
- Check that amount is greater than zero

❌ **Error: "Failed to load client data"**
- Verify client exists
- Check database connection
- Verify migration 005 is applied (credit_balance column)

## Test 4: Recurring Invoice Generation

### Step 1: Setup

Ensure you have:
- At least one active service with recurring billing enabled
- Service has reached its billing day

### Step 2: Generate Invoices

1. Navigate to **Services** page
2. Click **"Generate Invoices"** button
3. Confirm the action

### Expected Result

- ✅ Success message showing number of invoices created
- ✅ List of created invoices with invoice numbers, client names, and amounts
- ✅ New invoices appear in the Invoices page
- ✅ Service `last_invoice_date` is updated

### Common Issues

❌ **Error: "Failed to generate recurring invoices"**
- Check backend logs
- Verify migrations 005 and 006 are applied

❌ **No invoices generated**
- Check if services have reached their billing day
- Verify services have `recurring_billing_enabled = true`
- Check if invoices were already generated this month

## Test 5: Database Integrity

### Verify Critical Tables

Run these commands to verify the database structure:

```bash
# Check payment_allocations table
docker-compose exec postgres psql -U fireisp fireisp -c "\d payment_allocations"

# Check client_services columns
docker-compose exec postgres psql -U fireisp fireisp -c "\d client_services"

# Check clients credit_balance
docker-compose exec postgres psql -U fireisp fireisp -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'credit_balance';"

# List all migrations
docker-compose exec postgres psql -U fireisp fireisp -c "SELECT * FROM schema_migrations ORDER BY version;"
```

### Expected Results

All tables and columns mentioned in the migrations should exist.

## Troubleshooting

If any test fails:

1. **Check logs**:
   ```bash
   docker-compose logs backend | tail -50
   ```

2. **Verify migrations**:
   ```bash
   bash database/check-migrations.sh
   ```

3. **Check database connection**:
   ```bash
   docker-compose exec postgres psql -U fireisp fireisp -c "SELECT current_database();"
   ```

4. **Restart services if needed**:
   ```bash
   docker-compose restart backend
   ```

5. **Review troubleshooting guide**:
   See [TROUBLESHOOTING_PAYMENTS_SERVICES.md](TROUBLESHOOTING_PAYMENTS_SERVICES.md)

## Success Criteria

All tests should pass with:
- ✅ Services can be created with recurring billing configuration
- ✅ Service plans can be created
- ✅ Payments can be registered with invoice allocation
- ✅ Payments can be registered as direct credit
- ✅ Recurring invoices can be generated
- ✅ Client credit balance is tracked correctly
- ✅ No database errors in logs

If all criteria are met, the payment and service systems are working correctly!
