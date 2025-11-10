#!/bin/bash

# OneClick Development Server Startup Script
# This script starts the frontend development server and shows connection info

echo "🚀 Starting OneClick Development Server..."
echo ""

# Get WSL IP address
WSL_IP=$(hostname -I | awk '{print $1}')

echo "📍 Server will be accessible at:"
echo ""
echo "  From Windows Browser (WSL IP - WORKS):"
echo "  → http://${WSL_IP}:3000/quick-provision"
echo ""
echo "  From localhost (may need port forwarding):"
echo "  → http://localhost:3000/quick-provision"
echo ""
echo "  Root page:"
echo "  → http://${WSL_IP}:3000"
echo ""
echo "📝 Note: If localhost doesn't work, see WSL-LOCALHOST-FIX.md"
echo ""
echo "⚡ Starting Next.js development server..."
echo ""

cd /home/mfells/Projects/oneclick/frontend
npm run dev
