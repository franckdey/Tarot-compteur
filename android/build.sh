#!/bin/sh
# Fabrique l'APK sur Ubuntu/Debian.
# Paquets : aapt apksigner zipalign dalvik-exchange android-sdk-platform-23 openjdk-17-jdk
# La clé de signature (cle.jks) n'est pas dans le dépôt : gardez toujours la même pour les mises à jour.
set -e
cd "$(dirname "$0")"
J=/usr/lib/android-sdk/platforms/android-23/android.jar
KS=${KEYSTORE:-cle.jks}
rm -rf gen classes out assets; mkdir -p gen classes out assets/fonts
python3 prepare_assets.py
aapt package -f -m -J gen -M AndroidManifest.xml -S res -I $J
javac -nowarn --release 8 -classpath $J -d classes gen/fr/maxime/carnettarot/R.java src/fr/maxime/carnettarot/MainActivity.java
dalvik-exchange --dex --output=out/classes.dex classes
aapt package -f -M AndroidManifest.xml -S res -A assets -I $J -F out/unsigned.apk
(cd out && aapt add unsigned.apk classes.dex >/dev/null && zipalign -f -p 4 unsigned.apk aligned.apk)
apksigner sign --ks "$KS" ${KS_PASS:+--ks-pass env:KS_PASS} --ks-key-alias carnet --out out/carnet-tarot.apk out/aligned.apk
echo "APK prêt : android/out/carnet-tarot.apk"
