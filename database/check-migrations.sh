#!/bin/bash

# Migration verification and fix script
# This script helps diagnose and fix migration issues for FireISP

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}FireISP Migration Diagnostic${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose not found${NC}"
    exit 1
fi

# Check if postgres container is running
if ! docker-compose ps postgres | grep -q "Up"; then
    echo -e "${YELLOW}Starting postgres container...${NC}"
    docker-compose up -d postgres
    sleep 5
fi

echo -e "${GREEN}✓${NC} Postgres container is running"
echo ""

# Check if schema_migrations table exists
echo "Checking migration tracking system..."
if docker-compose exec -T postgres psql -U fireisp fireisp -c "SELECT 1 FROM schema_migrations LIMIT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Migration tracking table exists"
else
    echo -e "${YELLOW}⚠${NC} Migration tracking table not found"
    echo "  Initializing migration tracking..."
    docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/000_init_migration_tracking.sql
    echo -e "${GREEN}✓${NC} Migration tracking initialized"
fi
echo ""

# List applied migrations
echo "Applied migrations:"
APPLIED=$(docker-compose exec -T postgres psql -U fireisp fireisp -t -c "SELECT version || ' - ' || description FROM schema_migrations ORDER BY version;" | grep -v '^$')
if [ -z "$APPLIED" ]; then
    echo -e "${YELLOW}  No migrations applied yet${NC}"
else
    echo "$APPLIED" | while read line; do
        echo -e "  ${GREEN}✓${NC} $line"
    done
fi
echo ""

# Check for pending migrations
echo "Checking for pending migrations..."
PENDING=0
for migration in database/migrations/*.sql; do
    if [ ! -f "$migration" ]; then
        continue
    fi
    
    MIGRATION_FILE=$(basename "$migration")
    MIGRATION_VERSION=$(echo "$MIGRATION_FILE" | cut -d'_' -f1)
    
    if ! docker-compose exec -T postgres psql -U fireisp fireisp -t -c "SELECT 1 FROM schema_migrations WHERE version = '$MIGRATION_VERSION';" | grep -q "1"; then
        echo -e "  ${YELLOW}⚠${NC} Pending: $MIGRATION_FILE"
        PENDING=$((PENDING + 1))
    fi
done

if [ $PENDING -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} All migrations are up to date"
else
    echo ""
    echo -e "${YELLOW}Found $PENDING pending migration(s)${NC}"
    echo ""
    read -p "Would you like to apply pending migrations? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Applying pending migrations..."
        
        for migration in database/migrations/*.sql; do
            if [ ! -f "$migration" ]; then
                continue
            fi
            
            MIGRATION_FILE=$(basename "$migration")
            MIGRATION_VERSION=$(echo "$MIGRATION_FILE" | cut -d'_' -f1)
            
            if ! docker-compose exec -T postgres psql -U fireisp fireisp -t -c "SELECT 1 FROM schema_migrations WHERE version = '$MIGRATION_VERSION';" | grep -q "1"; then
                echo -e "  Applying ${BLUE}$MIGRATION_FILE${NC}..."
                
                if docker-compose exec -T postgres psql -U fireisp fireisp < "$migration" 2>&1 | tee /tmp/migration_output.log | grep -qi "error"; then
                    echo -e "  ${RED}✗${NC} Failed to apply $MIGRATION_FILE"
                    echo "  Check /tmp/migration_output.log for details"
                    exit 1
                else
                    # Record migration
                    MIGRATION_DESC=$(echo "$MIGRATION_FILE" | sed 's/^[0-9]\+_//;s/\.sql$//')
                    docker-compose exec -T postgres psql -U fireisp fireisp -c "INSERT INTO schema_migrations (version, description) VALUES ('$MIGRATION_VERSION', '$MIGRATION_DESC') ON CONFLICT (version) DO NOTHING;" > /dev/null 2>&1
                    echo -e "  ${GREEN}✓${NC} Applied $MIGRATION_FILE"
                fi
            fi
        done
        
        echo ""
        echo -e "${GREEN}All migrations applied successfully!${NC}"
    fi
fi
echo ""

# Check critical tables for payment/service functionality
echo "Checking critical tables..."

# Check payment_allocations table (from migration 005)
if docker-compose exec -T postgres psql -U fireisp fireisp -c "\d payment_allocations" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} payment_allocations table exists (payment system enabled)"
else
    echo -e "  ${RED}✗${NC} payment_allocations table missing (migration 005 not applied)"
    echo -e "    ${YELLOW}Payment registration will not work without this table${NC}"
fi

# Check clients.credit_balance column (from migration 005)
if docker-compose exec -T postgres psql -U fireisp fireisp -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'credit_balance';" | grep -q "credit_balance"; then
    echo -e "  ${GREEN}✓${NC} clients.credit_balance column exists (credit system enabled)"
else
    echo -e "  ${RED}✗${NC} clients.credit_balance column missing (migration 005 not applied)"
fi

# Check client_services.recurring_billing_enabled column (from migration 006)
if docker-compose exec -T postgres psql -U fireisp fireisp -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'client_services' AND column_name = 'recurring_billing_enabled';" | grep -q "recurring_billing_enabled"; then
    echo -e "  ${GREEN}✓${NC} client_services.recurring_billing_enabled column exists (recurring invoices enabled)"
else
    echo -e "  ${RED}✗${NC} client_services.recurring_billing_enabled column missing (migration 006 not applied)"
    echo -e "    ${YELLOW}Service creation with recurring billing will not work without this column${NC}"
fi

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Diagnostic Complete${NC}"
echo -e "${BLUE}================================${NC}"
