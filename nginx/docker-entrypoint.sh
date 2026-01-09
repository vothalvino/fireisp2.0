#!/bin/sh
set -e

# Ensure SSL directory exists
mkdir -p /etc/nginx/ssl

# Create Let's Encrypt ACME challenge directory structure
# This directory must exist and be writable for Let's Encrypt HTTP-01 challenges to work
echo "Creating Let's Encrypt ACME challenge directory..."
mkdir -p /etc/nginx/ssl/.well-known/acme-challenge
chmod -R 755 /etc/nginx/ssl/.well-known
echo "ACME challenge directory created at /etc/nginx/ssl/.well-known/acme-challenge"

# Check if SSL certificates exist and are readable, if not generate self-signed ones
if [ ! -f "/etc/nginx/ssl/cert.pem" ] || [ ! -f "/etc/nginx/ssl/key.pem" ] || \
   [ ! -r "/etc/nginx/ssl/cert.pem" ] || [ ! -r "/etc/nginx/ssl/key.pem" ]; then
    echo "SSL certificates not found or not readable. Generating self-signed certificates..."
    if openssl req -x509 -nodes -days 90 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=FireISP/CN=localhost" 2>&1; then
        echo "Self-signed SSL certificates generated successfully."
    else
        echo "ERROR: Failed to generate SSL certificates. nginx may fail to start."
        exit 1
    fi
else
    echo "SSL certificates found and readable."
fi

# Execute the original nginx entrypoint
exec /docker-entrypoint.sh "$@"
