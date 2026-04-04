#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

# Increase Node.js memory limit for heavy build processes
export NODE_OPTIONS="--max-old-space-size=4096"

# 1. Navigate to client, install dependencies, and build frontend for production
echo "Building the frontend Client..."
cd client
npm install
npm run build

# 2. Ensure server directory exists and move frontend build
echo "Moving frontend build to server directory..."
cd ../server
npm install
rm -rf dist
mv ../client/dist ./dist

# 3. Start the node backend
echo "Starting the backend Server..."
node server.js
