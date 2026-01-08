# Testing the HTTP/HTTPS Connection Fix

## Problem Fixed
The nginx proxy configuration was stripping the `/api/` prefix when forwarding requests to the backend, causing 404 errors and connection refused issues.

## Changes Made
Updated `nginx/nginx.conf`:
- Line 52 (HTTP server): Changed `proxy_pass http://backend:3000/;` to `proxy_pass http://backend:3000/api/;`
- Line 90 (HTTPS server): Changed `proxy_pass http://backend:3000/;` to `proxy_pass http://backend:3000/api/;`

## How It Works
**Before the fix:**
- Frontend makes request: `GET /api/auth/login`
- Nginx receives: `/api/auth/login`
- Nginx proxies to: `http://backend:3000/auth/login` (strips `/api/`)
- Backend expects: `/api/auth/login`
- Result: 404 Not Found ❌

**After the fix:**
- Frontend makes request: `GET /api/auth/login`
- Nginx receives: `/api/auth/login`
- Nginx proxies to: `http://backend:3000/api/auth/login` (preserves `/api/`)
- Backend expects: `/api/auth/login`
- Result: 200 OK ✅

## Testing Instructions

### 1. Build and Start Containers
```bash
cd /home/runner/work/fireisp2.0/fireisp2.0
docker compose build
docker compose up -d
```

### 2. Test API Endpoints
Once containers are running, test the API endpoints:

```bash
# Check if backend is responding
curl -v http://localhost/api/setup/status

# Expected response: JSON with setup status (not 404)
```

### 3. Access the Web Interface
Open a browser and navigate to:
- HTTP: `http://localhost` or `http://your-server-ip`
- HTTPS: `https://localhost` or `https://your-server-ip` (if SSL configured)

### 4. Expected Results
- ✅ No "connection refused" errors
- ✅ No 404 errors in browser console
- ✅ Setup wizard or login page loads correctly
- ✅ API requests complete successfully

### 5. Check Logs
```bash
# Backend logs should show successful API requests
docker compose logs backend

# Nginx logs should show 200 status codes (not 404)
docker compose logs frontend
```

## Verification

The fix ensures proper routing of API requests from the frontend through nginx to the backend. All API endpoints (`/api/setup`, `/api/auth`, `/api/clients`, etc.) should now work correctly over both HTTP and HTTPS.
