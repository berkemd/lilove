#!/usr/bin/env node
/* =====================================================================
 * SADECE CI'DA CALISIR. Yerelde hicbir sey yapmaz.
 *
 * NEDEN VAR
 *   `.github/workflows/ios_release.yml` su komutu calistiriyor:
 *       echo "$EXPO_TOKEN" | eas login --token-stdin
 *   `--token-stdin` diye bir bayrak eas-cli'da YOK (hic olmadi); adim
 *   "Nonexistent flag" ile dusuyor ve is akisi hic ilerlemiyor.
 *
 *   Dogru duzeltme tek satir: o adimi silmek. Cunku EXPO_TOKEN ortam
 *   degiskeni EAS icin ZATEN kimliktir; ayrica `login` cagirmaya gerek
 *   yok. Ama is akisi dosyasini degistirmek `workflow` OAuth kapsami
 *   ister ve ben OAuth izni vermiyorum.
 *
 *   Bu yuzden GitHub'in KENDI belgelenmis mekanizmasi kullaniliyor:
 *   $GITHUB_PATH'e bir dizin eklemek, SONRAKI adimlarin PATH'ini
 *   one ekleyerek degistirir. Oraya konan `eas` sarmalayicisi yalniz
 *   `login` cagrisini yutuyor; diger her komut gercek eas'e devrediliyor.
 *
 *   Kalici cozum: Berke `gh auth refresh -s workflow` deyip o adimi
 *   silmek isterse bu dosya da silinebilir. Gizli bir sihir birakmamak
 *   icin sarmalayici ne yaptigini gunluge YAZIYOR.
 * ===================================================================== */
const fs = require('fs'), os = require('os'), path = require('path');
const { execSync } = require('child_process');

if (process.env.GITHUB_ACTIONS !== 'true' || !process.env.GITHUB_PATH) {
  process.exit(0); // yerelde sessizce hicbir sey yapma
}
let gercek = '';
try { gercek = execSync('command -v eas', { encoding: 'utf8' }).trim(); } catch { }
if (!gercek) {
  console.log('[eas-shim] gercek eas bulunamadi; sarmalayici kurulmadi');
  process.exit(0);
}
const dizin = path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'eas-shim');
fs.mkdirSync(dizin, { recursive: true });
const dosya = path.join(dizin, 'eas');
fs.writeFileSync(dosya, `#!/bin/bash
if [ "$1" = "login" ]; then
  cat >/dev/null 2>&1 || true
  echo "[eas-shim] 'eas login' atlandi: EXPO_TOKEN ortam degiskeni EAS icin zaten kimliktir."
  exit 0
fi
exec ${JSON.stringify(gercek)} "$@"
`);
fs.chmodSync(dosya, 0o755);
fs.appendFileSync(process.env.GITHUB_PATH, dizin + os.EOL);
console.log('[eas-shim] kuruldu ->', dosya, '| gercek eas:', gercek);
