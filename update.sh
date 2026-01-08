#!/bin/bash

# FireISP Update Script
# This script automates the update process for FireISP installations

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Installation directory
INSTALL_DIR="/opt/fireisp"
LOG_FILE="$INSTALL_DIR/update.log"
BACKUP_DIR="$INSTALL_DIR/backups"
ROLLBACK_FILE="$INSTALL_DIR/.rollback_info"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to show usage
show_usage() {
    cat << EOF
FireISP Update Script

Usage: $0 [OPTIONS]

OPTIONS:
    --help              Show this help message
    --check             Check for available updates without applying
    --rollback          Rollback to the previous version
    --skip-backup       Skip automatic backup (not recommended)
    --force             Force update even if no updates are available

EXAMPLES:
    $0                  Run a normal update
    $0 --check          Check if updates are available
    $0 --rollback       Rollback to previous version

EOF
}

# Parse command line arguments
SKIP_BACKUP=false
CHECK_ONLY=false
ROLLBACK=false
FORCE_UPDATE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_usage
            exit 0
            ;;
        --check)
            CHECK_ONLY=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --force)
            FORCE_UPDATE=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Change to installation directory
cd "$INSTALL_DIR" || {
    print_error "Installation directory not found: $INSTALL_DIR"
    exit 1
}

# Initialize log file
echo "=== FireISP Update Log - $(date) ===" > "$LOG_FILE"

print_info "FireISP Update Script Started"
echo ""

# Function to get current version
get_current_version() {
    if [ -f "$INSTALL_DIR/VERSION" ]; then
        cat "$INSTALL_DIR/VERSION" | tr -d '\n'
    else
        echo "unknown"
    fi
}

# Function to check for updates
check_updates() {
    print_info "Checking for updates..."
    
    git fetch origin main 2>&1 | tee -a "$LOG_FILE"
    
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        return 1 # No updates
    else
        return 0 # Updates available
    fi
}

# Function to create backup
create_backup() {
    print_info "Creating backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Generate backup filename
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Backup database
    if docker-compose exec -T postgres pg_dump -U fireisp fireisp > "$BACKUP_FILE" 2>/dev/null; then
        print_success "Database backup created: $BACKUP_FILE"
        
        # Store backup filename for potential rollback
        echo "$BACKUP_FILE" > "$INSTALL_DIR/.last_backup"
        
        # Keep only last 5 backups to save space
        cd "$BACKUP_DIR"
        ls -t backup_*.sql | tail -n +6 | xargs -r rm
        cd "$INSTALL_DIR"
        
        return 0
    else
        print_error "Failed to create database backup"
        return 1
    fi
}

# Function to apply database migrations
apply_migrations() {
    print_info "Checking for database migrations..."
    
    # Ensure postgres is running
    docker-compose up -d postgres 2>&1 | tee -a "$LOG_FILE"
    
    # Wait for postgres to be ready
    sleep 5
    
    # Initialize migration tracking if needed
    if [ -f "$INSTALL_DIR/database/migrations/000_init_migration_tracking.sql" ]; then
        print_info "Initializing migration tracking..."
        docker-compose exec -T postgres psql -U fireisp fireisp < "$INSTALL_DIR/database/migrations/000_init_migration_tracking.sql" 2>&1 | tee -a "$LOG_FILE" || true
    fi
    
    # Get list of applied migrations
    APPLIED_MIGRATIONS=$(docker-compose exec -T postgres psql -U fireisp fireisp -t -c "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null | tr -d ' ' | grep -v '^$' || echo "")
    
    # Apply pending migrations
    MIGRATIONS_APPLIED=0
    for migration in database/migrations/*.sql; do
        if [ ! -f "$migration" ]; then
            continue
        fi
        
        # Extract version number from filename
        MIGRATION_FILE=$(basename "$migration")
        MIGRATION_VERSION=$(echo "$MIGRATION_FILE" | cut -d'_' -f1)
        
        # Skip if already applied
        if echo "$APPLIED_MIGRATIONS" | grep -q "^${MIGRATION_VERSION}$"; then
            continue
        fi
        
        print_info "Applying migration: $MIGRATION_FILE"
        
        # Apply migration
        if docker-compose exec -T postgres psql -U fireisp fireisp < "$migration" 2>&1 | tee -a "$LOG_FILE"; then
            # Record migration
            MIGRATION_DESC=$(echo "$MIGRATION_FILE" | sed 's/^[0-9]*_//;s/.sql$//')
            docker-compose exec -T postgres psql -U fireisp fireisp -c "INSERT INTO schema_migrations (version, description) VALUES ('$MIGRATION_VERSION', '$MIGRATION_DESC') ON CONFLICT (version) DO NOTHING;" 2>&1 | tee -a "$LOG_FILE"
            
            print_success "Migration applied: $MIGRATION_FILE"
            MIGRATIONS_APPLIED=$((MIGRATIONS_APPLIED + 1))
        else
            print_error "Failed to apply migration: $MIGRATION_FILE"
            return 1
        fi
    done
    
    if [ $MIGRATIONS_APPLIED -eq 0 ]; then
        print_info "No new migrations to apply"
    else
        print_success "Applied $MIGRATIONS_APPLIED migration(s)"
    fi
    
    return 0
}

# Function to perform rollback
perform_rollback() {
    print_warning "Starting rollback procedure..."
    
    if [ ! -f "$ROLLBACK_FILE" ]; then
        print_error "No rollback information found"
        print_info "You can manually rollback using: git checkout <previous_version>"
        exit 1
    fi
    
    # Read rollback info
    PREVIOUS_COMMIT=$(cat "$ROLLBACK_FILE")
    
    print_info "Rolling back to commit: $PREVIOUS_COMMIT"
    
    # Stop services
    print_info "Stopping services..."
    docker-compose down 2>&1 | tee -a "$LOG_FILE"
    
    # Checkout previous version
    print_info "Restoring previous version..."
    git checkout "$PREVIOUS_COMMIT" 2>&1 | tee -a "$LOG_FILE"
    
    # Rebuild containers
    print_info "Rebuilding containers..."
    docker-compose build 2>&1 | tee -a "$LOG_FILE"
    
    # Start services
    print_info "Starting services..."
    docker-compose up -d 2>&1 | tee -a "$LOG_FILE"
    
    # Wait for services
    sleep 10
    
    # Restore database if user wants
    if [ -f "$INSTALL_DIR/.last_backup" ]; then
        LAST_BACKUP=$(cat "$INSTALL_DIR/.last_backup")
        if [ -f "$LAST_BACKUP" ]; then
            read -p "Do you want to restore the database from backup? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                print_info "Restoring database..."
                cat "$LAST_BACKUP" | docker-compose exec -T postgres psql -U fireisp fireisp 2>&1 | tee -a "$LOG_FILE"
                print_success "Database restored"
            fi
        fi
    fi
    
    # Remove rollback file
    rm -f "$ROLLBACK_FILE"
    
    print_success "Rollback completed"
    print_info "Current version: $(get_current_version)"
    
    exit 0
}

# Main update function
perform_update() {
    CURRENT_VERSION=$(get_current_version)
    print_info "Current version: $CURRENT_VERSION"
    
    # Check for updates
    if check_updates; then
        print_success "Updates available!"
        
        # Show what will be updated
        print_info "Changes to be applied:"
        git log --oneline HEAD..origin/main | head -10 | tee -a "$LOG_FILE"
        echo ""
    else
        if [ "$FORCE_UPDATE" = true ]; then
            print_warning "No updates available, but forcing update anyway..."
        else
            print_success "Already up to date!"
            exit 0
        fi
    fi
    
    # Store current commit for rollback
    git rev-parse HEAD > "$ROLLBACK_FILE"
    
    # Create backup
    if [ "$SKIP_BACKUP" = false ]; then
        if ! create_backup; then
            read -p "Backup failed. Continue anyway? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_error "Update cancelled"
                exit 1
            fi
        fi
    else
        print_warning "Skipping backup (not recommended)"
    fi
    
    # Stop services
    print_info "Stopping services..."
    docker-compose stop 2>&1 | tee -a "$LOG_FILE"
    
    # Pull updates
    print_info "Downloading updates..."
    git pull origin main 2>&1 | tee -a "$LOG_FILE"
    
    # Check for environment changes
    if [ -f ".env.example" ]; then
        print_info "Checking for new environment variables..."
        # This is informational - actual .env is preserved
        NEW_VARS=$(comm -13 <(grep -v '^#' .env | cut -d'=' -f1 | sort) <(grep -v '^#' .env.example | cut -d'=' -f1 | sort) 2>/dev/null || echo "")
        if [ -n "$NEW_VARS" ]; then
            print_warning "New environment variables detected in .env.example:"
            echo "$NEW_VARS"
            print_info "Please review and add to your .env file if needed"
        fi
    fi
    
    # Apply database migrations
    if ! apply_migrations; then
        print_error "Migration failed! You may need to rollback."
        print_info "To rollback: $0 --rollback"
        exit 1
    fi
    
    # Rebuild containers
    print_info "Rebuilding Docker containers..."
    docker-compose build 2>&1 | tee -a "$LOG_FILE"
    
    # Start services
    print_info "Starting services..."
    docker-compose up -d 2>&1 | tee -a "$LOG_FILE"
    
    # Wait for services to start
    print_info "Waiting for services to start..."
    sleep 15
    
    # Health check
    print_info "Performing health check..."
    
    # Check if containers are running
    if docker-compose ps | grep -q "Up"; then
        print_success "Containers are running"
    else
        print_error "Some containers failed to start"
        print_info "Check logs with: docker-compose logs"
        print_info "To rollback: $0 --rollback"
        exit 1
    fi
    
    # Check backend health
    if docker-compose exec -T backend wget -q -O- http://localhost:3000/api/health 2>/dev/null | grep -q "ok"; then
        print_success "Backend is healthy"
    else
        print_warning "Backend health check failed (this may be normal if setup is not complete)"
    fi
    
    # Get new version
    NEW_VERSION=$(get_current_version)
    
    # Clean up
    rm -f "$ROLLBACK_FILE"
    
    # Success!
    print_success "Update completed successfully!"
    echo ""
    print_info "Version: $CURRENT_VERSION → $NEW_VERSION"
    echo ""
    print_info "Access your installation at: http://$(hostname -I | awk '{print $1}')"
    echo ""
    print_info "To view logs: docker-compose logs -f"
    print_info "To check status: docker-compose ps"
    echo ""
    
    if [ -f "$INSTALL_DIR/.last_backup" ]; then
        LAST_BACKUP=$(cat "$INSTALL_DIR/.last_backup")
        print_info "Backup saved at: $LAST_BACKUP"
    fi
    
    echo ""
    print_warning "Please verify the application is working correctly"
    print_info "If you encounter issues, you can rollback with: $0 --rollback"
}

# Main script execution
echo "========================================="
echo "     FireISP Update Script v1.0"
echo "========================================="
echo ""

# Handle rollback
if [ "$ROLLBACK" = true ]; then
    perform_rollback
    exit 0
fi

# Handle check only
if [ "$CHECK_ONLY" = true ]; then
    print_info "Checking for updates..."
    if check_updates; then
        print_success "Updates are available!"
        echo ""
        print_info "Changes available:"
        git log --oneline HEAD..origin/main | head -10
        echo ""
        print_info "To update, run: $0"
        exit 0
    else
        print_success "Already up to date!"
        exit 0
    fi
fi

# Perform update
perform_update

exit 0
