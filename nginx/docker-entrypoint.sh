#!/bin/sh
set -e

# Ensure SSL directory exists
mkdir -p /etc/nginx/ssl

# Check if SSL certificates exist, if not generate self-signed ones
if [ ! -f "/etc/nginx/ssl/cert.pem" ] || [ ! -f "/etc/nginx/ssl/key.pem" ]; then
    echo "SSL certificates not found. Generating self-signed certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=FireISP/CN=localhost" 2>/dev/null || true
    echo "Self-signed SSL certificates generated."
else
    echo "SSL certificates found."
fi

# Execute the original nginx entrypoint
exec /docker-entrypoint.sh "$@"
