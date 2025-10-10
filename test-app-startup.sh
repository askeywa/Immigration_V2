#!/bin/bash

echo "=== TESTING APPLICATION STARTUP ==="

# Navigate to the backend directory
cd /var/www/immigration-portal/backend

echo "Current directory: $(pwd)"
echo "Files in directory:"
ls -la

echo ""
echo "=== CHECKING ENVIRONMENT FILE ==="
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "First 10 lines of .env:"
    head -10 .env
    echo ""
    echo "Checking for required variables:"
    if grep -q "MONGODB_URI" .env; then
        echo "✅ MONGODB_URI found"
    else
        echo "❌ MONGODB_URI missing"
    fi
    
    if grep -q "JWT_SECRET" .env; then
        echo "✅ JWT_SECRET found"
    else
        echo "❌ JWT_SECRET missing"
    fi
    
    if grep -q "NODE_ENV" .env; then
        echo "✅ NODE_ENV found"
    else
        echo "❌ NODE_ENV missing"
    fi
else
    echo "❌ .env file not found!"
    exit 1
fi

echo ""
echo "=== CHECKING BUILT APPLICATION ==="
if [ -f "dist/server.js" ]; then
    echo "✅ dist/server.js exists"
    echo "File size: $(ls -lh dist/server.js | awk '{print $5}')"
else
    echo "❌ dist/server.js not found!"
    echo "Contents of dist directory:"
    ls -la dist/ || echo "dist directory does not exist"
    exit 1
fi

echo ""
echo "=== CHECKING NODE MODULES ==="
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
    echo "Node modules count: $(ls node_modules | wc -l)"
else
    echo "❌ node_modules not found!"
    exit 1
fi

echo ""
echo "=== TESTING NODE.JS STARTUP ==="
echo "Testing Node.js with the built application..."

# Test if Node.js can load the application
timeout 10s node -e "
try {
    console.log('Testing server.js import...');
    require('./dist/server.js');
    console.log('✅ Server.js loaded successfully');
} catch (error) {
    console.error('❌ Error loading server.js:', error.message);
    process.exit(1);
}
" || echo "❌ Node.js test failed or timed out"

echo ""
echo "=== TESTING PM2 STARTUP ==="
echo "Stopping any existing PM2 processes..."
pm2 stop immigration-portal 2>/dev/null || true
pm2 delete immigration-portal 2>/dev/null || true

echo "Starting with PM2..."
pm2 start dist/server.js --name "immigration-portal" --env production

echo "Waiting 5 seconds..."
sleep 5

echo "PM2 Status:"
pm2 status

echo "PM2 Logs (last 20 lines):"
pm2 logs immigration-portal --lines 20

echo ""
echo "=== TEST COMPLETE ==="
