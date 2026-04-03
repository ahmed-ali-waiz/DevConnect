#!/bin/bash

# Navigate to server and start backend
cd server
npm install
npm start &  # '&' runs it in background

# Navigate to client and start frontend
cd ../client
npm install
npm run dev
