# Déploiement GitHub Pages (Vite + PWA)

## 1) Préparer le repo GitHub

1. Pousse ce projet sur GitHub (branche `main` ou `master`).
2. Vérifie que le workflow est présent:
   - `.github/workflows/deploy-pages.yml`

## 2) Activer Pages côté GitHub

1. Ouvre `Settings` du repo.
2. Va dans `Pages`.
3. Dans `Build and deployment`, choisis:
   - `Source: GitHub Actions`

## 3) Lancer le premier déploiement

1. Prépare les 30 audios locaux (voir `AUDIO_LOCAL_SETUP.md`):
   - `npm run audio:prepare`
   - `npm run audio:check`
2. Fais un push sur `main` (ou `master`), ou lance le workflow manuellement depuis `Actions`.
3. Attends la fin du job `Deploy to GitHub Pages`.

Le workflow exécute `npm run audio:check` avant le build. Si les 30 fichiers MP3 ne sont pas
présents dans `public/audio`, le déploiement est bloqué.

## 4) URL de ton app

- Repo standard `owner/repo`:
  - `https://owner.github.io/repo/`
- Repo site user/org `owner.github.io`:
  - `https://owner.github.io/`

La config Vite détecte automatiquement ce cas et ajuste le `base path`.

## 5) Installer sur iPhone (PWA)

1. Ouvre l’URL dans Safari.
2. `Partager` -> `Ajouter à l’écran d’accueil`.
3. Lance l’app depuis l’icône créée.

## 6) Option domaine personnalisé (facultatif)

1. Dans `Settings > Pages > Custom domain`, renseigne ton domaine.
2. Configure DNS chez ton registrar.
3. Active `Enforce HTTPS` une fois le certificat prêt.
