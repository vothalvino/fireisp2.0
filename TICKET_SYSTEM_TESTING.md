# Ticket System Testing Guide

This document provides step-by-step instructions to test the new ticket system functionality.

## Prerequisites

1. FireISP is running with Docker containers
2. You have completed the setup wizard
3. You can log in to the FireISP web interface
4. Database migration has been applied

## Apply Database Migration

First, apply the database migration to add the ticket tables:

```bash
cd /opt/fireisp  # or wherever FireISP is installed

# Apply the migration
docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/002_add_ticket_system.sql

# Verify tables were created
docker-compose exec postgres psql -U fireisp -c "\dt tickets*"
```

Expected output should show:
- `tickets` table
- `ticket_comments` table

## Test Scenarios

### 1. Access Tickets Page

1. Log in to FireISP web interface
2. Click on "Tickets" in the sidebar (new menu item with ticket icon)
3. **Expected Result**: You should see the Tickets page with:
   - Page title "Support Tickets"
   - Statistics cards showing counts (all zeros initially)
   - "New Ticket" button
   - Empty tickets table with appropriate message

### 2. Create Client-Linked Ticket

1. Click "New Ticket" button
2. Fill in the form:
   - **Client**: Select any existing client from dropdown
   - **Title**: "Client internet connection issue"
   - **Description**: "Customer reports slow internet speeds"
   - **Type**: "Support"
   - **Priority**: "High"
   - **Assign To**: Select a user (optional)
3. Click "Create Ticket"
4. **Expected Result**: 
   - Success message appears
   - You're redirected to tickets list
   - New ticket appears in the table with:
     - Auto-generated ticket number (TK000001)
     - Client company name displayed
     - Status badge showing "open"
     - Priority badge showing "high"

### 3. Create Independent Ticket

1. Click "New Ticket" button
2. Fill in the form:
   - **Client**: Leave as "-- Independent Ticket --" (don't select a client)
   - **Title**: "Server maintenance required"
   - **Description**: "Need to update server software"
   - **Type**: "Maintenance"
   - **Priority**: "Medium"
   - **Assign To**: Select a user (optional)
3. Click "Create Ticket"
4. **Expected Result**:
   - Success message appears
   - New ticket appears with ticket number TK000002
   - Client column shows "Independent" badge (blue badge)
   - Status is "open"

### 4. View Ticket Details

1. From tickets list, click the eye icon (👁️) on any ticket
2. **Expected Result**: Ticket details page shows:
   - Ticket number in page header
   - Ticket title and description
   - Status and priority badges
   - Client information (or "Independent Ticket" badge)
   - Assigned user
   - Created by information
   - Created date/time
   - Status dropdown
   - Assign To dropdown
   - Comments section (empty initially)
   - Comment input box
   - Delete button

### 5. Add Comments to Ticket

1. In ticket details view, scroll to comments section
2. Type a comment in the text area: "Investigating the issue"
3. Click "Add Comment"
4. **Expected Result**:
   - Comment appears immediately
   - Shows your username and timestamp
   - Comment is displayed with gray background

5. Add another comment: "Issue resolved. Updated settings."
6. **Expected Result**: Second comment appears below the first

### 6. Update Ticket Status

1. In ticket details view, find the "Status" dropdown
2. Change status from "open" to "in_progress"
3. **Expected Result**:
   - Status updates immediately
   - Status badge updates to show "in progress" with appropriate color

4. Change status to "resolved"
5. **Expected Result**:
   - Status badge shows "resolved" (green)
   - Resolved timestamp is recorded

### 7. Change Ticket Assignment

1. In ticket details view, find the "Assigned To" dropdown
2. Select a different user
3. **Expected Result**:
   - Assignment updates immediately
   - User shown in ticket list is updated

### 8. Filter Tickets

1. Go back to tickets list (click "Back to List")
2. Use the filter dropdowns:
   - **Status filter**: Select "Open" - should show only open tickets
   - **Priority filter**: Select "High" - should show only high priority tickets
   - **Type filter**: Select "Support" - should show only support tickets
3. **Expected Result**: Table updates to show only matching tickets

4. Reset filters by selecting "All" options
5. **Expected Result**: All tickets shown again

### 9. Verify Statistics

1. Check the statistics cards at top of tickets page
2. **Expected Result**: Stats should show:
   - Open count
   - In Progress count
   - Pending count
   - Resolved count
   - Urgent count
   - Independent count (tickets without clients)

### 10. Delete Ticket

1. From tickets list, click trash icon (🗑️) on a ticket
2. Confirm deletion in dialog
3. **Expected Result**:
   - Success message appears
   - Ticket is removed from list
   - Statistics update accordingly

### 11. Test Independent vs Client Tickets

Create several tickets and verify:
1. Client-linked tickets show client company name and code
2. Independent tickets show "Independent" badge
3. Both types can be created, viewed, and managed equally
4. Filtering works for both types
5. Statistics correctly distinguish between them

## Additional Tests

### Navigation Test
1. Click through all menu items
2. Verify "Tickets" appears between "Invoices" and "Users"
3. Tickets icon should be visible

### Responsive Design Test
1. Resize browser window to mobile size
2. Verify tickets page is responsive
3. Check that tables are scrollable on small screens

### Data Validation Test
1. Try creating ticket without title
2. **Expected Result**: Form validation error
3. Try creating ticket with only title
4. **Expected Result**: Ticket created successfully (other fields have defaults)

## Troubleshooting

### Migration Fails
```bash
# Check if migration was already applied
docker-compose exec postgres psql -U fireisp -c "SELECT * FROM schema_migrations WHERE version = '002';"

# If it exists, migration was already applied
# If not, check postgres logs:
docker-compose logs postgres
```

### Tickets Menu Not Showing
```bash
# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

# Clear browser cache and reload
```

### API Errors
```bash
# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

### Cannot Create Tickets
1. Check browser console for errors
2. Verify you're logged in (check for JWT token)
3. Check network tab for API responses
4. Verify backend container is running: `docker-compose ps`

## Success Criteria

All tests pass when:
- ✅ Can create client-linked tickets
- ✅ Can create independent tickets
- ✅ Can view ticket details
- ✅ Can add comments to tickets
- ✅ Can update ticket status
- ✅ Can change ticket assignment
- ✅ Filters work correctly
- ✅ Statistics display accurately
- ✅ Can delete tickets
- ✅ Navigation includes Tickets menu item

## Notes

- Ticket numbers are auto-generated sequentially (TK000001, TK000002, etc.)
- Independent tickets are identified by having no client_id (NULL in database)
- All ticket operations require authentication
- Comments are always associated with the logged-in user
- Status changes are tracked with timestamps (resolved_at, closed_at)
