# Tiny Phonics

A tablet-first toddler letter sound matching game built with Vite, React, and TypeScript.

## Commands

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

## Notes

- The game uses custom Pointer Events for press, hold, drag, and snap.
- The audio layer supports real prerecorded clips by `soundId`; the current v1 falls back to playful browser speech plus Web Audio pop sounds when clips are missing.
- Settings and progress are stored locally and fail gracefully if storage is blocked.
- The app registers a service worker and caches the loaded app shell/assets for offline replay after the first online load.
