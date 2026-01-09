# Ticket System Test Plan

## Prerequisites
- Database tables must be created (either via fresh install or migration)
- At least one user account must exist
- Backend server must be running
- Frontend must be accessible

## Test Cases

### 1. Fresh Installation Test
**Objective**: Verify ticket tables are created automatically

```bash
# For new installations, verify tables exist
docker-compose exec postgres psql -U fireisp fireisp -c "\dt tickets"
docker-compose exec postgres psql -U fireisp fireisp -c "\dt ticket_comments"
```

**Expected**: Both tables should exist without running migrations manually.

### 2. Existing Installation Test
**Objective**: Verify migration works for existing installations

```bash
# For existing installations without ticket tables
docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/002_add_ticket_system.sql
```

**Expected**: Migration should complete without errors (idempotent).

### 3. Load Tickets Page
**Objective**: Verify the tickets page loads without errors

**Steps**:
1. Login to the application
2. Navigate to Tickets menu
3. Observe the page loads

**Expected**:
- Page loads without errors
- Statistics cards display (all zeros if no tickets)
- Empty table shows "No tickets found" message
- "New Ticket" button is visible

### 4. User Dropdown Test (Create Form)
**Objective**: Verify users can be selected when creating a ticket

**Steps**:
1. Click "New Ticket" button
2. Observe "Assign To" dropdown
3. Click the dropdown
4. Select different users

**Expected**:
- Dropdown shows "-- Unassigned --" option
- Dropdown shows all active users in the system
- Users are selectable
- Selected user is highlighted

### 5. Create Ticket Without Assignment
**Objective**: Verify unassigned tickets can be created

**Steps**:
1. Click "New Ticket"
2. Fill in Title: "Test Unassigned Ticket"
3. Leave "Assign To" as "-- Unassigned --"
4. Click "Create Ticket"

**Expected**:
- Ticket is created successfully
- Alert shows "Ticket created successfully"
- Ticket appears in the list
- "Assigned To" column shows "Unassigned"

### 6. Create Ticket With User Assignment
**Objective**: Verify tickets can be assigned to users during creation

**Steps**:
1. Click "New Ticket"
2. Fill in Title: "Test Assigned Ticket"
3. Select a user from "Assign To" dropdown
4. Click "Create Ticket"

**Expected**:
- Ticket is created successfully
- Ticket appears in the list
- "Assigned To" column shows the selected username

### 7. Assign User to Existing Ticket
**Objective**: Verify users can be assigned to existing tickets

**Steps**:
1. Click "View Details" on an unassigned ticket
2. Find "Assigned To" dropdown in details view
3. Select a user from the dropdown
4. Wait for update to complete

**Expected**:
- Dropdown shows current assignment
- User can be selected
- Update happens automatically (no save button needed)
- Alert shows "Ticket updated successfully" or similar
- Assigned username appears in the ticket details
- When returning to list, assignment is visible

### 8. Unassign User from Ticket
**Objective**: Verify users can be unassigned from tickets

**Steps**:
1. Click "View Details" on an assigned ticket
2. Find "Assigned To" dropdown
3. Select "Unassigned" option
4. Wait for update to complete

**Expected**:
- Dropdown changes to "Unassigned"
- Update succeeds
- Returning to list shows "Unassigned"

### 9. Create Client-Linked Ticket
**Objective**: Verify tickets can be linked to clients

**Steps**:
1. Click "New Ticket"
2. Select a client from the "Client" dropdown
3. Fill in title and assign to a user
4. Create ticket

**Expected**:
- Ticket is created with client link
- Ticket list shows client company name and code
- Ticket details show client information

### 10. Create Independent Ticket
**Objective**: Verify independent tickets (no client) work

**Steps**:
1. Click "New Ticket"
2. Leave "Client" as "-- Independent Ticket --"
3. Fill in title and assign to a user
4. Create ticket

**Expected**:
- Ticket is created without client
- Ticket list shows "Independent" badge
- Ticket details show "Independent Ticket" label

### 11. Verify Empty States
**Objective**: Ensure graceful handling when no data exists

**Test scenarios**:
- No users exist (unlikely but possible)
- No clients exist
- No tickets exist

**Expected**:
- Application doesn't crash
- Dropdowns show only default options if data is empty
- Appropriate empty state messages

### 12. Browser Console Check
**Objective**: Verify no JavaScript errors

**Steps**:
1. Open browser developer tools (F12)
2. Go to Console tab
3. Navigate through ticket pages
4. Create, view, and update tickets

**Expected**:
- No red error messages in console
- No warnings about undefined variables or failed API calls
- Successful API responses (200 status codes)

## Common Issues and Solutions

### Issue: "Failed to load tickets" Alert
**Cause**: Database tables don't exist
**Solution**: Run the migration or rebuild database

### Issue: User dropdown is empty
**Cause**: No users in database OR API error
**Solution**: 
- Check if users exist: `docker-compose exec postgres psql -U fireisp fireisp -c "SELECT * FROM users;"`
- Check backend logs for errors

### Issue: Cannot select user (dropdown disabled or not responding)
**Cause**: JavaScript error or missing data
**Solution**:
- Check browser console for errors
- Verify users array is loaded (check Network tab in dev tools)
- Check backend API response format

### Issue: Ticket created but assignment not saved
**Cause**: NULL vs empty string handling
**Solution**: This should be fixed by the recent changes. Verify backend properly converts empty string to NULL.

## Success Criteria

All test cases must pass for the ticket system to be considered fully functional:
- ✅ Tables exist in database
- ✅ Tickets page loads without errors
- ✅ User dropdowns are populated and functional
- ✅ Tickets can be created with and without assignment
- ✅ Users can be assigned and unassigned from tickets
- ✅ Both client-linked and independent tickets work
- ✅ No errors in browser console
- ✅ All CRUD operations work correctly
