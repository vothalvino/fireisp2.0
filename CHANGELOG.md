# Changelog

All notable changes to FireISP 2.0 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Service plan creation UI in Services page
  - "Add Plan" button in Service Plans section
  - Complete form for creating new service plans
  - Service type selection dropdown
  - Plan details: name, description, speeds, price, billing cycle
  - Form validation and error handling
- Comprehensive update system for easy application updates
  - `update.sh` script with automatic backup, migration, and rollback capabilities
  - Version checking and health verification
  - Detailed logging of update process
- `VERSION` file for semantic versioning tracking
- Database migration framework with tracking system
  - `database/migrations/` directory structure
  - Migration tracking table (`schema_migrations`)
  - Documentation for creating and applying migrations
- Enhanced `fireisp` CLI management script
  - `version` command to check current version
  - `update` command now uses the comprehensive update script
  - Improved backup organization (saves to `backups/` directory)
- Comprehensive documentation:
  - `UPDATE.md` - Complete update guide with troubleshooting
  - `RELEASE_PROCESS.md` - Release procedures for maintainers
  - `database/migrations/README.md` - Migration creation guide

### Changed
- Backup files now saved to `backups/` directory instead of root
- `fireisp` script now supports passing arguments to update command
- README.md now includes dedicated update section with version checking
- Enhanced `.gitignore` to exclude backup files and update artifacts

### Fixed
- Service plan management workflow - users can now create plans through the UI
  - Previously, users could not add services because plans had to exist first
  - Added UI for creating service plans before creating client services
  - Resolves chicken-and-egg problem in service management workflow
- Fixed nginx proxy configuration causing HTTP/HTTPS connection issues
  - Changed `proxy_pass` from `http://backend:3000/` to `http://backend:3000/api/`
  - Ensures API requests properly route to backend with correct path
  - Previous fix was incorrect - backend expects `/api/` prefix in all routes
  - Resolves "connection refused" and 404 errors when accessing API endpoints

## [2.0.0] - 2024-01-07

### Added
- Complete ISP management system from scratch
- Docker containerization with docker-compose
- Ubuntu 24.04 installation script
- PostgreSQL database with organized schema
- Node.js/Express REST API backend
- React-based modern web UI with gradient themes
- Setup wizard for initial configuration
  - Root user creation
  - SSL configuration (optional)
  - Company information setup
- CRM functionality
  - Client management
  - Multi-service support per client
  - Service plans and types
  - Client service assignment
- FreeRADIUS integration
  - Mikrotik compatibility
  - NAS device management
  - Active session monitoring
  - Accounting and statistics
  - PostgreSQL backend for RADIUS
- Authentication system
  - JWT-based authentication
  - Secure password hashing
  - Role-based access control
- Dashboard with statistics
  - Active clients and services
  - RADIUS session monitoring
  - Bandwidth usage tracking
  - Service expiration alerts
- Comprehensive documentation
  - Installation guide
  - Quick start guide
  - Mikrotik integration guide
  - Contributing guidelines

### Features
- Modern, responsive web interface
- Real-time session monitoring
- Bandwidth usage tracking
- Service expiration notifications
- Multi-service support per client
- Automatic RADIUS user management
- Database backups and restore
- Management CLI tool
- Development environment support
- SSL/HTTPS support

### Security
- JWT authentication
- Password hashing with bcrypt
- SQL injection prevention with prepared statements
- Environment-based configuration
- Secure password generation in installer
- Optional SSL/TLS encryption

### Documentation
- README.md - Main documentation
- QUICKSTART.md - Quick start guide
- MIKROTIK.md - Mikrotik integration guide
- CONTRIBUTING.md - Contribution guidelines
- LICENSE - MIT license

## [1.0.0] - Previous Version
- Initial concept (ISP management tool)
