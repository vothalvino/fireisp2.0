# Changelog

All notable changes to FireISP 2.0 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Fixed nginx proxy configuration causing API connection refused errors
  - Changed `proxy_pass` from `http://backend:3000/api/` to `http://backend:3000/`
  - Prevents double `/api/` path in API requests
  - Resolves "connection refused" errors when accessing the GUI

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
