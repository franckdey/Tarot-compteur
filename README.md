# Carnet de tarot

Une petite appli pour tenir la marque d'une partie de tarot entre amis, jouée avec de vraies cartes. De 3 à 5 joueurs, avec les règles de la FFT.

## Ce qu'elle fait

- Liste de joueurs habituels : on touche ceux qui sont présents au début de la partie.
- Saisie d'une donne : preneur (et partenaire appelé à 5), contrat, bouts, points de l'attaque ou de la défense. Le résultat de chacun s'affiche avant d'enregistrer.
- Petit au bout, poignées simple, double ou triple, chelem.
- Totaux et classement en haut, feuille des donnes avec les cumuls. Une donne se corrige ou se supprime en touchant sa ligne.
- Historique des parties terminées.
- Tout reste dans le téléphone, sans compte et sans internet.

## Règles de marque

- Points à faire selon les bouts : 56 (0 bout), 51 (1), 41 (2), 36 (3).
- Marque = (25 + écart) × coefficient : Petite ×1, Garde ×2, Garde sans ×4, Garde contre ×6. Un demi-point d'écart compte pour un point.
- Petit au bout : 10 × coefficient. Poignée : 20, 30 ou 40, au camp qui gagne. Chelem : +400 annoncé et réussi, −200 annoncé et chuté, +200 non annoncé.
- À 3 joueurs le preneur marque 2 parts, à 4 joueurs 3 parts, à 5 joueurs 2 parts et son partenaire 1 part (4 parts s'il joue seul).

## Installer sur Android

Sur le téléphone, ouvrez le fichier [`apk/carnet-tarot.apk`](apk/carnet-tarot.apk) dans ce dépôt, touchez **Download raw** (ou l'icône de téléchargement), puis ouvrez le fichier téléchargé et autorisez l'installation. Une nouvelle version s'installe par-dessus l'ancienne sans perdre les scores.

## Contenu du dépôt

| Dossier | Rôle |
|---|---|
| `web/` | L'appli en page web (un seul fichier `index.html`). Elle peut être servie par n'importe quel serveur web. |
| `apk/` | L'APK prêt à installer. |
| `android/` | L'enveloppe Android qui affiche la page web hors ligne, et `build.sh` pour fabriquer l'APK. |
