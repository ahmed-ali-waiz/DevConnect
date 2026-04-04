#!/bin/bash
set -e

# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

echo "Starting the backend Server..."
cd server
node server.js
