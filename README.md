# EngLearn — Vocabulary Learning Mobile App

EngLearn is an offline-first mobile app built with **Expo + React Native + TypeScript** for learning English vocabulary based on the Oxford Word Lists (A1 → C1). It combines flashcards, a matching mini-game, a contextual reading exercise, a vocabulary-based placement test, and a hard-words review mode.

> Türkçe için bkz. [README.tr.md](README.tr.md)

---

## Highlights

- **4,500 words** across 5 CEFR levels (A1, A2, B1, B2, C1), each with **60 chapters × 15 words**.
- **3 mini-rounds per chapter:** 5 flashcards → matching game → 5 more → matching → 5 more → matching → contextual reading.
- **Vocabulary-based placement test (Find My Level)** with a 100-question bank; balanced random selection (2 per level).
- **Hard-words review mode:** words swiped "Don't know" are collected and can be re-practiced from the home screen.
- **Chapter completion tracking:** completed chapter buttons turn green with a check icon (persisted locally).
- **Swipe UX:** one-time tutorial overlay + first-card hint + alternative on-screen buttons (`DON'T KNOW` / `I KNOW`).
- **Confetti** celebration on chapter completion.
- **Reading practice** automatically generated per chapter from the chapter's 15 words (themed, grammatically safe).
- Persistent **streak**, **recommended level**, **completed chapters**, **hard words**, **swipe tutorial flag** (Zustand + AsyncStorage).
- **Fully offline** — no backend, no API keys, no telemetry.

---

## Tech Stack

- **Expo SDK 54** (managed → prebuild generates `android/` when needed)
- **React Native 0.81**, **React 19**, **TypeScript** (strict)
- **Expo Router 6** (file-based routing)
- **Zustand 5** + `zustand/middleware` `persist` + `@react-native-async-storage/async-storage`
- `react-native-deck-swiper`, `react-native-confetti-cannon`
- `expo-haptics` for tactile feedback

External tooling used at **build time only** (regenerable, not required at runtime):

- **Datamuse API** — fetched once for synonyms/antonyms (`scripts/fetchSynonyms.js`) and parts of speech (`scripts/fetchPOS.js`). Output is committed into the JSON data; no runtime API calls.

---

## Prerequisites

- **Node.js** 18 or 20 LTS
- **npm** (project lockfile uses npm)
- For Android: **Android Studio**, **Android SDK** (platform-tools / `adb` on PATH), **JDK 17 or 21**
- For iOS: macOS + Xcode (project not yet validated on iOS in this repo)

---

## Quick Start

```bash
# install deps
npm install

# run on a connected device or emulator (managed Expo)
npx expo start
```

Then press `a` for Android (requires emulator running or device connected via `adb`) or scan the QR with **Expo Go**.

> Note: Expo Go works for development. To produce a **standalone installable APK**, see "Build a Local APK" below.

---

## Build a Local APK (Android)

This produces a real, installable `.apk` that runs without Metro / Expo Go.

```powershell
# 1) Ensure the Android SDK and adb are on PATH (Windows example)
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"

# 2) Generate the native android/ folder (one-time per fresh clone)
npx expo prebuild --platform android

# 3) Build a signed-with-debug-key release APK
cd android
.\gradlew assembleRelease
cd ..

# 4) Install on a connected device
adb devices                              # list devices
adb -s <device-id> install -r android\app\build\outputs\apk\release\app-release.apk
```

The APK lands at:

```
android/app/build/outputs/apk/release/app-release.apk
```

> First Gradle build takes ~5–15 min (dependency resolution). Subsequent builds are much faster.

---

## App Flow

```
Home (level + chapter grid)
   ├── Find My Level  → 10-question vocab test → result + answer review → home pill "Recommended: B1"
   ├── Review Hard Words (N)  → SRS-style swipe through words you've gotten wrong
   └── Chapter
        ├── Flashcards (5)  → Matching (5)
        ├── Flashcards (5)  → Matching (5)
        ├── Flashcards (5)  → Matching (5)
        ├── Success screen (confetti)
        └── Reading (chapter's 15 words in a themed mini-story)
              └── FINISH CHAPTER  → marks chapter green, returns home
```

---

## Repository Layout

```
app/                  Expo Router screens
  _layout.tsx           Root Stack registration
  index.tsx             Home (levels + chapters + review/test buttons)
  flashcards.tsx        Swipe deck (5-card mini-rounds)
  matching.tsx          Matching mini-game
  success.tsx           Chapter success screen (confetti)
  reading.tsx           Themed reading practice + FINISH CHAPTER
  review.tsx            Hard-words review mode
  onboarding.tsx        Find My Level placement test

assets/
  bee.png               Home illustration
  images/               App icons, splash, adaptive icons
  data/
    A1.json … C1.json   Word data (5 × 900) + embedded readings (5 × 60)
    placement.json      100-question placement bank
    seviye_kelimeleri/  Source Oxford PDFs (kept for re-generation)

store/
  useVocabularyStore.ts Zustand store + persisted state

utils/
  wordHelper.ts         Chapter/group helpers, ID lookup, reading reader
  placement.ts          Balanced selection (2/level) + scoring

hooks/                  Color scheme hook (used by root layout)
scripts/                Data pipeline (see below)
android/                Native project (generated by expo prebuild)
```

---

## Data Pipeline (scripts/)

All scripts are **deterministic and idempotent-when-safe**; they exist so the JSON data can be regenerated from sources.

| Script | Purpose | When to run |
|---|---|---|
| `buildWords.js` | Parses PDF-extracted text → produces A1…C1 JSON (900 each), merges `manualWords.js` to reach exactly 900 per level | After updating source PDFs / manual additions |
| `manualWords.js` | Hand-curated words that fill the gap when a level's PDF has fewer than 900 unique entries | Source of truth for manual additions |
| `shuffleWords.js` | Deterministic Fisher–Yates shuffle (per-level seeded) so chapters aren't alphabetic | Once, after `buildWords.js`. ⚠️ Not idempotent — re-running re-shuffles |
| `verifyShuffle.js` | Acceptance check: 60×15 per level, no duplicates, mixed initials | After shuffle |
| `fetchPOS.js` | Calls Datamuse to get part-of-speech for every word (cached) | Once (cache: `.cache/pos.json`) |
| `buildSentences.js` | Per-word example sentence using POS-aware templates | After POS fetch |
| `fetchSynonyms.js` | Calls Datamuse for synonyms/antonyms with strict filters + blacklist | Once (cache: `.cache/datamuse.json`) |
| `auditSynonyms.js` | Bidirectional/POS audit of synonym/antonym pairs | After fetch / when curating |
| `buildReadings.js` | Generates a themed reading per chapter from its 15 words | After words finalized |
| `verifyReadings.js` | Coverage + length + forbidden-pattern checks | After building readings |
| `auditReadings.js` | Grammar audit (articles, possessives, abbreviations, numbers) | After building readings |
| `buildPlacement.js` | Generates the 100-question placement bank from real word data | Once / after word data changes |
| `reset-project.js` | (Inherited from Expo template) Resets `app/` — **safe to delete** |

Full reading-system documentation: [READING_CHECKPOINT.md](READING_CHECKPOINT.md).

---

## Persisted State

Stored in `AsyncStorage` (key: `vocabulary-storage`) via Zustand `persist.partialize`:

- `userLevel` — recommended level from Find My Level
- `placementResult` — last test result (answers, score, completedAt) for review
- `completedChapters` — `{ 'A2-11': true, ... }` for green chapter buttons
- `failedWords` — `{ 'A1-12-3': 2, ... }` for the review mode
- `streak`, `lastStreakDate` — daily streak
- `hasSeenSwipeTutorial` — one-time tutorial flag

Active chapter data (current deck, group index, reading text) is held in RAM only.

---

## Scripts

```bash
npm start         # expo start
npm run android   # expo run:android (rebuild + install)
npm run ios       # expo run:ios
npm run web       # expo start --web
npm run lint      # expo lint (ESLint + expo config)
```

---

## License

Not yet specified. MIT is a common default for small projects.
