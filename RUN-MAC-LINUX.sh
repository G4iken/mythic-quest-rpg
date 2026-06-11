#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "Installing Mythic Quest dependencies..."
npm install
echo "Starting Mythic Quest..."
npm run dev
