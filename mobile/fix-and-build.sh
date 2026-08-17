#!/bin/bash

echo "🚀 LiLove iOS Build Fix Script"
echo "=============================="
echo ""

# Step 1: Clean everything
echo "🧹 Cleaning old files..."
rm -rf node_modules package-lock.json .expo ios android

# Step 2: Install with legacy peer deps
echo "📦 Installing dependencies (this will take a minute)..."
npm install --legacy-peer-deps

# Step 3: Initialize EAS for the current project
echo ""
echo "🔧 Initializing EAS Project..."
echo "You'll be asked to link or create a new EAS project."
echo "Choose: Create a new project"
npx eas init

# Step 4: Build
echo ""
echo "🏗️ Building iOS app..."
npx eas build --platform ios --profile production --clear-cache

echo ""
echo "✅ Build process started!"
echo ""
echo "Once complete, submit to App Store with:"
echo "npx eas submit --platform ios --latest"