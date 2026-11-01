# Carnet de tarot

Feuille de marque pour des parties de tarot réelles entre amis (pas de jeu de cartes à l'écran). De 3 à 5 joueurs, règles de la FFT. L'utilisateur est francophone : l'interface, les commentaires du code, les messages de commit et les réponses sont en français.

## Structure

- `web/index.html` : **la source de vérité**. Toute l'appli tient dans ce fichier (HTML, CSS et JavaScript, sans dépendance ni étape de build). Les polices Alegreya SC et Alegreya Sans viennent de Google Fonts.
- `web/manifest.webmanifest`, `web/icon.svg` : pour l'ajout à l'écran d'accueil.
- `android/` : enveloppe Android minimale (une `WebView` qui charge `file:///android_asset/index.html`).
  - `MainActivity.java` : stockage local activé, écran toujours allumé, bouton retour qui appelle `window.retourAndroid()` dans la page avant de quitter.
  - `MiseAJour.java` et `InstallReceiver.java` : mise à jour intégrée. Au lancement, compare la version installée à `version.json` de la Release GitHub `latest` ; si elle est plus récente, appelle `window.majDisponible(version)` dans la page, qui propose d'installer avec `confirmer()` puis appelle `window.CarnetAndroid.installer()` (téléchargement de l'APK, installation via `PackageInstaller`, Android demande confirmation).
  - `prepare_assets.py` : copie `web/index.html` dans `android/assets/`, retire les liens Google Fonts et télécharge les polices en local pour que l'appli marche hors ligne.
  - `build.sh` : fabrique l'APK sans Gradle ni Android Studio (aapt, javac `--release 8`, dalvik-exchange, zipalign, apksigner, plateforme Android 23).

## Publier une version

Le workflow `.github/workflows/release.yml` s'en charge à chaque fusion dans `main` qui touche `web/` ou `android/` : il fabrique l'APK, le signe avec la vraie clé (secrets `KEYSTORE_BASE64` et `KS_PASS`) et remplace la Release `latest` (`carnet-tarot.apk` + `version.json`). Le numéro de version vient du numéro d'exécution du workflow (`versionCode` = numéro × 10, `versionName` = 2.numéro) : rien à changer à la main. Les téléphones proposent alors la mise à jour. Lien d'installation : `https://github.com/franckdey/Tarot-compteur/releases/latest/download/carnet-tarot.apk`. Ne pas committer d'APK dans le dépôt.

Fabriquer l'APK à la main (paquets Ubuntu : `aapt apksigner zipalign dalvik-exchange android-sdk-platform-23` et un JDK 17 ou plus) :

```
KEYSTORE=/chemin/vers/cle.jks KS_PASS=... sh android/build.sh
```

- La clé de signature (`cle.jks`, alias `carnet`, certificat « CN=Carnet de tarot ») n'est **jamais** dans le dépôt (`*.jks` est ignoré). Il faut toujours signer avec la même clé, sinon l'appli ne s'installe pas par-dessus l'ancienne et les scores sont perdus.
- `VERSION_CODE` et `VERSION_NAME` (facultatifs) remplacent les valeurs du manifeste.
- On compile contre l'API 23 avec `targetSdkVersion` 34 : pas d'API Android plus récente que la 23 dans le Java (par exemple `WebResourceRequest` n'existe pas, utiliser la variante avec `String url` ; `canRequestPackageInstalls()` est appelée par réflexion). Pas de lambdas : classes anonymes.

## Fonctionnement de la page

- Données dans `localStorage`, clé `tarotCompteur.v1` : `{ partie, archives, habitues, derniersNoms }`. Une partie : `{ id, debut, joueurs, premierDonneur, donnes }`. Une donne garde les choix bruts (`preneur`, `appele`, `contrat`, `bouts`, `points` de l'attaque, `petit`, `poigneeAtt`, `poigneeDef`, `chelem`) et les scores sont recalculés à l'affichage. Garder ce format compatible : les téléphones ont déjà des parties enregistrées.
- Tout le calcul est dans `calculerDonne(d, n)`, entre les commentaires `===== CALCUL` et `===== FIN CALCUL`. Ce bloc peut être extrait et testé seul avec Node.
- Les prénoms des joueurs en haut et dans les en-têtes sont réduits automatiquement par `ajusterNoms()` pour toujours tenir en entier.
- Pas de `alert()`, `confirm()` ni `prompt()` : utiliser `confirmer()` et `toast()`.
- Le donneur n'est pas affiché : l'utilisateur n'en veut pas.

## Règles de marque (FFT)

- Points à faire : 56 (0 bout), 51 (1), 41 (2), 36 (3).
- Marque de base = (25 + écart) × coefficient : Petite 1, Garde 2, Garde sans 4, Garde contre 6. Un demi-point d'écart est arrondi au point supérieur.
- Petit au bout : 10 × coefficient, au camp qui l'a mené au bout. Poignées simple, double, triple : 20, 30, 40, sans coefficient, au camp qui gagne la donne. Chelem : +400 annoncé et réussi, −200 annoncé et chuté, +200 non annoncé réussi, −200 s'il est réalisé par la défense.
- Répartition : 3 joueurs, preneur ×2 ; 4 joueurs, preneur ×3 ; 5 joueurs, preneur ×2 et partenaire ×1 (preneur ×4 s'il s'appelle seul). Chaque défenseur paie une part. La somme d'une donne fait toujours zéro.

## Vérifier un changement

- `npm install` une fois, puis `npm test` : tous les tests de `tests/` (calcul, page dans Chromium, règles de code). Le workflow `.github/workflows/tests.yml` les lance sur chaque PR avec la fabrication de l'APK ; les jobs **Tests** et **APK** doivent passer pour fusionner dans `main`. Ajouter un test dans `tests/` pour chaque règle de marque ou comportement modifié.
- Extraire le bloc de calcul et le tester avec Node sur quelques donnes types (3, 4 et 5 joueurs, somme nulle).
- Ouvrir `web/index.html` dans Chromium (Playwright) à 400 px de large : pas de défilement horizontal, pas d'erreur dans la console, prénoms longs lisibles.
- L'utilisateur joue sur des OnePlus Nord 2 et Nord 4 (Android).
