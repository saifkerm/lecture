# Audio Local Setup (GitHub Pages)

## Objectif

Servir les 30 audios directement depuis `public/audio` pour supprimer la dépendance aux serveurs externes.

## Pré-requis

1. `ffmpeg` installé et accessible dans le `PATH`.
2. Dossier local non versionné `audio-source/` (déjà ignoré par git).
3. Fichier de mapping `audio-source/mapping.json`.

## 1) Préparer les sources

1. Créer le dossier:
   - `mkdir -p audio-source`
2. Copier les 30 fichiers source dans `audio-source/`.
3. Créer `audio-source/mapping.json` à partir de:
   - `scripts/audio-mapping.example.json`
4. Adapter chaque `path` au vrai nom du fichier source.

## 2) Générer les audios finaux

Exécuter:

```bash
npm run audio:prepare
```

Le script:
- transcode en MP3 CBR 96k puis fallback 80k -> 64k -> 56k
- force mono 44.1 kHz
- sort les fichiers dans `public/audio/juz-01.mp3` ... `juz-30.mp3`
- vérifie automatiquement les budgets (fichier <= 90 MB, total <= 850 MB)

## 3) Vérifier le budget (CI/local)

```bash
npm run audio:check
```

Cette commande échoue si:
- il n'y a pas exactement 30 MP3
- un fichier dépasse 90 MB
- le total dépasse 850 MB

## 4) Déploiement

1. Commit uniquement `public/audio/*.mp3` + code.
2. Push sur `main`/`master`.
3. Le workflow GitHub Pages lance `audio:check` avant `build`.
