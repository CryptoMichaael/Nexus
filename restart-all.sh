#!/bin/bash
# Clean Restart Script for Nexus Stack

set -e

echo "🔴 Killing all Node/NPM processes..."
pkill -9 node 2>/dev/null || true
pkill -9 npm 2>/dev/null || true
sleep 2

echo "🧹 Clearing Vite caches..."
rm -rf nexus-frontend-prod/node_modules/.vite 2>/dev/null || true
rm -rf nexus-admin-frontend-prod/node_modules/.vite 2>/dev/null || true

echo "🚀 Starting Backend (Port 3000)..."
cd nexus-backend-prod
npm run dev > /tmp/nexus-backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
cd ..

sleep 3

echo "🚀 Starting User Frontend (Port 5173)..."
cd nexus-frontend-prod
npm run dev > /tmp/nexus-frontend.log 2>&1 &
USER_FE_PID=$!
echo "   User FE PID: $USER_FE_PID"
cd ..

sleep 2

echo "🚀 Starting Admin Frontend (Port 5174)..."
cd nexus-admin-frontend-prod
npm run dev > /tmp/nexus-admin.log 2>&1 &
ADMIN_FE_PID=$!
echo "   Admin FE PID: $ADMIN_FE_PID"
cd ..

sleep 5

echo ""
echo "✅ Startup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Backend:        http://localhost:3000"
echo "User Frontend:  http://localhost:5173"
echo "Admin Frontend: http://localhost:5174"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Logs:"
echo "  Backend: tail -f /tmp/nexus-backend.log"
echo "  User FE: tail -f /tmp/nexus-frontend.log"
echo "  Admin FE: tail -f /tmp/nexus-admin.log"
echo ""

# Verify services
echo "🔍 Verifying services..."
sleep 2

if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo "✅ Backend healthy"
else
    echo "❌ Backend not responding"
fi

if curl -s http://localhost:5173 | grep -q "Nexus Rewards"; then
    echo "✅ User Frontend loaded"
else
    echo "❌ User Frontend not loaded"
fi

if curl -s http://localhost:5174 | grep -q "Nexus Admin"; then
    echo "✅ Admin Frontend loaded"
else
    echo "❌ Admin Frontend not loaded"
fi

echo ""
echo "To stop all services: pkill -9 node"
