#!/bin/bash

# Deals247 Production Fix Script
# Run this on your VPS to fix the 502 Bad Gateway and deals loading issues

set -e

echo "🔧 Deals247 Production Fix Script"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/var/www/deals247"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run with sudo"
    exit 1
fi

cd $APP_DIR

echo ""
log_info "🔍 DIAGNOSING CURRENT ISSUES..."

# Check 1: PM2 status
echo ""
log_info "1. Checking PM2 status..."
pm2 status

# Check 2: Port 5000
echo ""
log_info "2. Checking if port 5000 is listening..."
if netstat -tlnp | grep -q ":5000 "; then
    log_success "✅ Port 5000 is listening"
else
    log_error "❌ Port 5000 is not listening"
fi

# Check 3: Backend health
echo ""
log_info "3. Testing backend health..."
if curl -f -s http://localhost:5000/api/health > /dev/null; then
    log_success "✅ Backend health check passed"
else
    log_error "❌ Backend health check failed"
fi

echo ""
log_info "🔧 APPLYING FIXES..."

# Fix 1: Kill any processes on port 5000
log_info "Fix 1: Cleaning up port 5000..."
fuser -k 5000/tcp 2>/dev/null || true
sleep 2

# Fix 2: Stop existing PM2 process
log_info "Fix 2: Stopping existing backend..."
pm2 stop deals247-backend 2>/dev/null || true
pm2 delete deals247-backend 2>/dev/null || true
sleep 2

# Fix 3: Start backend properly
log_info "Fix 3: Starting backend server..."
cd server
NODE_ENV=production PORT=5000 pm2 start index.js --name deals247-backend
cd ..
sleep 5

# Fix 4: Verify backend is working
log_info "Fix 4: Verifying backend startup..."
if curl -f -s http://localhost:5000/api/health > /dev/null; then
    log_success "✅ Backend started successfully"
else
    log_error "❌ Backend still not responding"
fi

# Fix 5: Reload Nginx
log_info "Fix 5: Reloading Nginx..."
sudo systemctl reload nginx

# Fix 6: Test database
log_info "Fix 6: Testing database connection..."
mysql -h srv994.hstgr.io -P 3306 -u u515501238_deals247_user -p'2ap5HYzh5@R8&Cq' u515501238_deals247_db -e "SELECT COUNT(*) as deals_count FROM deals WHERE deleted = 0;" 2>/dev/null

# Fix 7: Test API endpoints
log_info "Fix 7: Testing API endpoints..."
echo "Testing deals endpoint:"
curl -s "http://localhost:5000/api/deals?limit=1" | head -5

echo ""
echo "Testing users/profile endpoint:"
curl -s -X POST "http://localhost:5000/api/users/profile" -H "Content-Type: application/json" | head -3

# Fix 8: Save PM2 config
log_info "Fix 8: Saving PM2 configuration..."
pm2 save

echo ""
log_success "🎉 FIXES APPLIED!"
echo ""
echo "📊 VERIFICATION:"
echo "1. Backend Health: $(curl -s http://localhost:5000/api/health | jq .status 2>/dev/null || echo 'Check manually')"
echo "2. Public Access: $(curl -I https://deals247.online/api/health 2>/dev/null | head -1)"
echo ""
echo "If issues persist, check logs:"
echo "- PM2 logs: pm2 logs deals247-backend"
echo "- Nginx logs: sudo tail -f /var/log/nginx/error.log"