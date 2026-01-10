# Quick Fix: Service and Payment Issues

If you're experiencing issues creating services or registering payments, follow these steps:

## 1. Run the Migration Diagnostic Tool

```bash
sudo bash database/check-migrations.sh
```

This will:
- Check which migrations are applied
- Show any pending migrations
- Offer to apply them automatically

**When prompted, press `y` to apply pending migrations.**

## 2. Verify the Fix

After applying migrations, verify the critical tables exist:

```bash
docker-compose exec postgres psql -U fireisp fireisp -c "\dt payment_allocations"
```

You should see the `payment_allocations` table listed.

## 3. Restart Backend (Optional)

If issues persist, restart the backend:

```bash
docker-compose restart backend
```

## 4. Test the Functionality

### Test Service Creation:
1. Go to Services page
2. Click "Add Service"
3. Fill in the form and create a service
4. Should succeed without errors

### Test Payment Registration:
1. Go to Payments page
2. Click "Register Payment"
3. Select a client and fill in payment details
4. Should succeed without errors

## Still Having Issues?

If problems persist after following these steps:

1. Check backend logs:
   ```bash
   docker-compose logs backend | tail -50
   ```

2. See the detailed troubleshooting guide:
   - [TROUBLESHOOTING_PAYMENTS_SERVICES.md](TROUBLESHOOTING_PAYMENTS_SERVICES.md)

3. See the testing guide:
   - [TESTING_PAYMENTS_SERVICES.md](TESTING_PAYMENTS_SERVICES.md)

## Technical Details

The issue is caused by missing database migrations:
- **Migration 005**: Adds payment system with payment allocations
- **Migration 006**: Adds recurring billing fields to services

These migrations are required for the payment and service features to work correctly.
