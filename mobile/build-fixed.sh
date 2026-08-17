#!/bin/bash
# LiLove - Fixed EAS Build Script
# Disables capability sync to prevent Apple Developer Portal conflicts

set -e

echo "🔧 LiLove iOS Build - Capability Sync Disabled"
echo "=============================================="
echo ""
echo "Bu build Apple Developer Portal'daki mevcut capability"
echo "ayarlarını koruyacak ve override etmeyecek."
echo ""

# Option 1: Clear cache and rebuild
read -p "Cache temizlensin mi? (önerilir) (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🧹 Cache temizleniyor..."
  EXPO_NO_CAPABILITY_SYNC=1 npx eas build --platform ios --profile production --clear-cache --non-interactive
else
  echo "📦 Normal build başlatılıyor..."
  EXPO_NO_CAPABILITY_SYNC=1 npx eas build --platform ios --profile production --non-interactive
fi

echo ""
echo "✅ Build başlatıldı!"
echo ""
echo "📊 Build ilerlemesini takip et:"
echo "   https://expo.dev/accounts/berkekahraman/projects/lilove/builds"
echo ""
