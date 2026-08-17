#!/bin/bash

# LiLove iOS Build Script

echo "🚀 LiLove iOS Build Script"
echo "=========================="
echo ""

# Step 1: Clean install
echo "📦 Step 1: Cleaning and installing dependencies..."
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Step 2: Check if eas-cli is installed
if ! command -v eas &> /dev/null
then
    echo "📲 Installing EAS CLI..."
    npm install -g eas-cli
fi

# Step 3: Login to EAS
echo ""
echo "🔐 Step 2: EAS Login"
echo "If not logged in, you'll be prompted for credentials"
eas whoami || eas login

# Step 4: Build
echo ""
echo "🏗️ Step 3: Building iOS app..."
eas build --platform ios --profile production

echo ""
echo "✅ Build submitted! Check the EAS dashboard for status."
echo ""
echo "Once build is complete, submit to App Store:"
echo "eas submit --platform ios --latest"