# 5 Fold Life - Netlify Export

This project is now prepared as a static Netlify site.

## Deploy modes

### 1. Git-connected Netlify site
- Connect this repo to Netlify.
- Build command: leave blank.
- Publish directory: `frontend`
- `netlify.toml` already points Netlify at the correct publish directory.

### 2. Drag-and-drop deploy
- Upload the contents of `frontend/` to Netlify, or use the generated `netlify-export.zip`.
- The export already includes `_headers` and `_redirects`.

## Files used by Netlify
- `netlify.toml`: sets `frontend` as the publish directory.
- `frontend/_headers`: adds security headers and long-lived caching for assets.
- `frontend/_redirects`: routes all SPA requests back to `index.html`.

## Notes
- This app is fully static. No backend, serverless functions, or environment variables are required for the current build.
- The results screen uses a generated profile emblem instead of mascot PNG files, which keeps the export and editor workspace lighter.
