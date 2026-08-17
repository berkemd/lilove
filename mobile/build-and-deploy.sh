#!/bin/bash

# LiLove - Mobile App Build & Deploy Script
# iOS Production Build and TestFlight Submission

set -e  # Exit on error

echo "🚀 LiLove Mobile App - Production Deployment"
echo "============================================"
echo ""

# Check if we're in the mobile directory
if [ ! -f "app.config.js" ]; then
  echo "❌ Hata: mobile/ dizininde değilsiniz!"
  echo "Lütfen: cd mobile && ./build-and-deploy.sh"
  exit 1
fi

# ARTIK RevenueCat YOK — dolayısıyla o gizli anahtar da yok.
# Bu kapı eskiden `REVENUECAT_IOS_API_KEY` arıyordu ve o anahtar hiçbir
# zaman kurulmamıştı; yani bu betik ilk satırında duruyordu. Ayrıca
# `app.json` diye bir dosya da yok (yapılandırma `app.config.js`),
# yani ikinci kontrol de her zaman düşerdi.

echo ""
echo "📱 iOS Production Build başlatılıyor..."
echo "⏱️ Bu işlem 15-30 dakika sürebilir"
echo ""

# Start iOS production build
npx eas build --platform ios --profile production --non-interactive

echo ""
echo "✅ Build tamamlandı!"
echo ""

# Ask for TestFlight submission
read -p "📤 TestFlight'a submit edilsin mi? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "📤 TestFlight'a submit ediliyor..."
  npx eas submit --platform ios --profile production --latest
  
  echo ""
  echo "✅ TestFlight submission tamamlandı!"
  echo "🎉 App birkaç dakika içinde TestFlight'ta görünecek"
else
  echo "⏭️ TestFlight submission atlandı"
  echo ""
  echo "Manuel submit için:"
  echo "  npx eas submit --platform ios --profile production --latest"
fi

echo ""
echo "============================================"
echo "✨ Deployment tamamlandı!"
echo ""
echo "📱 TestFlight: https://appstoreconnect.apple.com/"
echo "📊 EAS Dashboard: https://expo.dev/accounts/berkekahraman/projects/lilove"
echo ""
