# Vocabulary Flashcards — Mobile App

This repository contains a lightweight mobile application built with Expo and React Native. The app provides a focused flashcard experience for learning vocabulary, including swipe gestures, daily streak tracking, and a matching mini-game.

## Key Features

- Deck-based flashcards with swipe interactions ("I know" / "Again").
- Persistent daily streak tracking (local AsyncStorage via Zustand persist).
- Matching game that follows successful learning batches.
- Offline-capable with local JSON word lists.
- Minimal, readable TypeScript + React Native codebase.

## Tech Stack

- Expo
- React Native
- TypeScript
- Zustand (state management)
- AsyncStorage (persistence)

## Prerequisites

- Node.js 16+ (or compatible LTS)
- npm or yarn
- Expo CLI (for native device/simulator workflows)

Install Expo CLI (optional):

```bash
npm install -g expo-cli
```

## Setup & Run

1. Install dependencies

```bash
npm install
# or: yarn install
```

2. Start the development server

```bash
npm run start
# or: yarn start
```

3. Run on a platform

- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`

## Repository Layout

- `app/` — Application screens and routing (Expo Router)
- `assets/` — Images and local data (word lists)
- `components/` — Reusable UI components
- `store/` — Zustand store with persistence and domain logic
- `utils/` — Helper functions and data loaders
- `scripts/` — Utility scripts (project reset)

## Environment & Secrets

This project does not require server-side API keys by default. If you add credentials, store them in environment files and be sure they are included in `.gitignore`. The repository already ignores common local files like `.DS_Store` and `node_modules`.

Sensitive or large private assets found in `assets/data/` are intentionally ignored to avoid accidental commits. If you want to publish them, update `.gitignore` accordingly.

## Maintenance Notes

- Avoid heavy re-renders of the parent screen while `react-native-deck-swiper` is active to prevent UI freezes.
- Streaks are tracked per-day; a failed card resets the streak for that day.

## Contributing

1. Fork the repository and create a descriptive branch.
2. Keep PRs small and focused.
3. Run `npm run lint` and ensure TypeScript checks pass.

## License

Add a license if desired (MIT is common for small projects).

---

If you want, I can also add a concise `README.tr.md` (Turkish) with equivalent content.
