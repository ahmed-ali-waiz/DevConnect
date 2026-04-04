#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

# Increase Node.js memory limit for heavy build processes
export NODE_OPTIONS="--max-old-space-size=4096"

# 1. Navigate to client, install dependencies, and build frontend for production
echo "Building the frontend Client..."
cd client
npm install
npm run build

# 2. Navigate to server, install dependencies, and start the node backend
echo "Starting the backend Server..."
cd ../server
npm install
node server.js
