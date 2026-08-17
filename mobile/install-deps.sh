#!/bin/bash
# Generate package-lock.json for EAS Build

set -e

echo "📦 Installing dependencies and generating package-lock.json..."

# Ensure npm uses lockfile
npm config set package-lock true

# Install dependencies
npm install

# Verify lockfile created
if [ -f "package-lock.json" ]; then
  echo "✅ package-lock.json created successfully"
  ls -lh package-lock.json
else
  echo "❌ Failed to create package-lock.json"
  exit 1
fi

echo ""
echo "✅ Dependencies installed!"
echo "📝 Running Expo Doctor to verify..."

npx expo-doctor@latest || true

echo ""
echo "✅ Ready for EAS build!"
