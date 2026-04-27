# Tiny Phonics

A tablet-first toddler letter sound matching game built with Vite, React, and TypeScript.

## Commands

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
npm run generate:audio
```

## Notes

- The game uses custom Pointer Events for press, hold, drag, and snap.
- The audio layer plays generated MP3 clips by `soundId` and falls back to playful browser speech only if an asset is missing.
- Audio clips live under `public/audio`; rerun `npm run generate:audio` to regenerate the first-pass fast voice pack.
- Settings and progress are stored locally and fail gracefully if storage is blocked.
- The app registers a service worker and caches the loaded app shell/assets for offline replay after the first online load.
