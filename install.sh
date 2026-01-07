#!/bin/bash

set -e

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# FireISP 2.0 Installation Script for Ubuntu 24.04
echo "================================================"
echo "FireISP 2.0 Installation Script"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "Please run as root (use sudo)"
   exit 1
fi

# Check Ubuntu version
if ! grep -q "Ubuntu 24.04" /etc/os-release; then
    echo "Warning: This script is designed for Ubuntu 24.04"
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required packages
echo "Installing required packages..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git

# Install Docker
echo "Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Set up Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    echo "Docker installed successfully"
else
    echo "Docker is already installed"
fi

# Install Docker Compose (standalone)
echo "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose installed successfully"
else
    echo "Docker Compose is already installed"
fi

# Create installation directory
INSTALL_DIR="/opt/fireisp"
echo "Creating installation directory at $INSTALL_DIR..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Clone or copy FireISP repository
echo "Setting up FireISP application..."
if [ -d "$INSTALL_DIR/.git" ]; then
    echo "Updating existing installation..."
    git pull
else
    # Check if script is being run from a valid FireISP directory
    if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
        echo "Copying files from $SCRIPT_DIR..."
        # Copy all visible files
        cp -r "$SCRIPT_DIR"/* $INSTALL_DIR/ 2>/dev/null || true
        # Copy hidden files (excluding . and ..)
        find "$SCRIPT_DIR" -maxdepth 1 -name ".*" ! -name "." ! -name ".." ! -name ".git" -exec cp -r {} $INSTALL_DIR/ \; 2>/dev/null || true
    elif [ -f "/tmp/fireisp-install/docker-compose.yml" ]; then
        echo "Copying files from installation package..."
        cp -r /tmp/fireisp-install/* $INSTALL_DIR/
    else
        echo "Error: Cannot find FireISP files."
        echo "Please run this script from the FireISP directory or clone the repository first."
        echo "Example: git clone https://github.com/vothalvino/fireisp2.0.git && cd fireisp2.0 && sudo bash install.sh"
        exit 1
    fi
fi

# Generate secure passwords
echo "Generating secure passwords..."
DB_PASSWORD=$(openssl rand -base64 32)
RADIUS_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# Create .env file
echo "Creating environment configuration..."
cat > $INSTALL_DIR/.env << EOF
# Database Configuration
DB_PASSWORD=$DB_PASSWORD

# RADIUS Configuration
RADIUS_SECRET=$RADIUS_SECRET

# Application Configuration
JWT_SECRET=$JWT_SECRET

# Network Ports
HTTP_PORT=80
HTTPS_PORT=443
EOF

# Create necessary directories
echo "Creating required directories..."
mkdir -p $INSTALL_DIR/uploads
mkdir -p $INSTALL_DIR/ssl
mkdir -p $INSTALL_DIR/database/init
mkdir -p $INSTALL_DIR/radius

# Create placeholder files
touch $INSTALL_DIR/uploads/.gitkeep
touch $INSTALL_DIR/ssl/.gitkeep

# Set permissions
echo "Setting permissions..."
chown -R root:root $INSTALL_DIR
chmod 600 $INSTALL_DIR/.env

# Build and start containers
echo "Building and starting Docker containers..."
cd $INSTALL_DIR
docker-compose pull
docker-compose build
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "================================================"
    echo "FireISP 2.0 Installation Complete!"
    echo "================================================"
    echo ""
    echo "Access the application at: http://$(hostname -I | awk '{print $1}')"
    echo ""
    echo "Important: Complete the setup wizard to:"
    echo "  1. Create the root user account"
    echo "  2. Configure SSL certificate (optional)"
    echo "  3. Configure RADIUS settings"
    echo ""
    echo "To view logs: cd $INSTALL_DIR && docker-compose logs -f"
    echo "To stop: cd $INSTALL_DIR && docker-compose stop"
    echo "To start: cd $INSTALL_DIR && docker-compose start"
    echo "To restart: cd $INSTALL_DIR && docker-compose restart"
    echo ""
    echo "Default credentials will be set during setup wizard"
    echo "================================================"
else
    echo ""
    echo "ERROR: Some containers failed to start"
    echo "Check logs with: cd $INSTALL_DIR && docker-compose logs"
    exit 1
fi
