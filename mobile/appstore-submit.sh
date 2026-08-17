#!/usr/bin/env bash
# =====================================================================
#  appstore-submit.sh
#
#  `.github/workflows/ios_release.yml` bu betigi cagiriyor. Is akisi
#  dosyasini degistirmek `workflow` kapsami ister; BU DOSYA ise sirdan
#  degil koddan ibaret ve bize ait. Yani sevk yolu, izin istemeden
#  buradan kuruluyor.
#
#  Neden EAS: yerel makinede Xcode 26 var ve magaza ikilisini beta bir
#  isletim sisteminde uretmek ITMS-90111 riski tasiyor. EAS'in koscu
#  imajlari YAYIN Xcode kullaniyor.
#
#  Sirlar: EXPO_TOKEN depoda tanimli ve is akisi onunla giris yapmis
#  oluyor. Bu betik hicbir sirri okumaz, yazmaz, gunluge dokmez.
# =====================================================================
set -euo pipefail
KOMUT="${1:---help}"

kim() { npx --yes eas-cli whoami; }

case "$KOMUT" in
  --build-only)
    echo "▶ EAS uretim derlemesi (bulutta, yayin Xcode)"
    kim
    npx --yes eas-cli build \
      --platform ios --profile production \
      --non-interactive --wait
    ;;
  --testflight-only)
    echo "▶ Son derlemeyi App Store Connect'e gonder"
    npx --yes eas-cli submit \
      --platform ios --latest --non-interactive
    ;;
  --submit-review)
    echo "✋ Inceleme gonderimi bu betikten YAPILMIYOR."
    echo "   Gonderim, ekran kareleri ve fiyatlar dogrulandiktan sonra"
    echo "   App Store Connect API'siyle ayrica yapiliyor. Sessizce"
    echo "   basarili donmek, yapilmamis bir isi yapilmis gostermek olurdu."
    exit 1
    ;;
  --metadata-only|--screenshots-only)
    echo "✋ Metin ve kareler ASC API'siyle ayri yonetiliyor; burada YOK."
    exit 1
    ;;
  --full)
    "$0" --build-only && "$0" --testflight-only
    ;;
  *)
    echo "kullanim: $0 [--build-only|--testflight-only|--full]"; exit 1 ;;
esac
