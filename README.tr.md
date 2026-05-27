# EngLearn — Kelime Öğrenme Mobil Uygulaması

EngLearn, Oxford Word List'lerine (A1 → C1) dayalı İngilizce kelime öğrenmek için **Expo + React Native + TypeScript** ile yazılmış, çevrimdışı çalışan bir mobil uygulamadır. Flashcard'lar, eşleştirme mini oyunu, bağlamsal okuma, kelime tabanlı seviye tespit testi ve zor kelimeler için tekrar modu içerir.

> For English see [README.md](README.md)

---

## Öne Çıkanlar

- **4.500 kelime**, 5 CEFR seviyesinde (A1, A2, B1, B2, C1) — her seviye **60 chapter × 15 kelime**.
- **Chapter başına 3 mini-tur:** 5 flashcard → eşleştirme → 5 yeni kelime → eşleştirme → 5 daha → eşleştirme → bağlamsal okuma.
- **Kelime tabanlı seviye tespit testi (Find My Level)** — 100 soruluk lokal bank, her seviyeden 2 soru ile dengeli seçim.
- **Zor kelimeler tekrar modu:** "Don't know" diye işaretlenen kelimeler birikiyor ve ana ekrandan tekrar çalışılabiliyor.
- **Chapter tamamlama takibi:** bitirilen chapter butonları yeşile dönüyor, onay simgesi ekleniyor (kalıcı).
- **Swipe UX:** ilk girişte tek seferlik öğretici overlay + ilk kartta küçük ipucu + alternatif `DON'T KNOW` / `I KNOW` butonları.
- **Konfeti** kutlaması (chapter bitince).
- **Okuma parçaları**, o chapter'ın 15 kelimesinden tema çerçeveli şekilde build-time'da üretiliyor.
- Kalıcı: **streak**, **önerilen seviye**, **tamamlanan chapter'lar**, **zor kelimeler**, **swipe öğretici bayrağı** (Zustand + AsyncStorage).
- **Tamamen çevrimdışı** — backend yok, API anahtarı yok, telemetri yok.

---

## Teknoloji

- **Expo SDK 54** (managed → gerektiğinde `npx expo prebuild` ile `android/` üretilir)
- **React Native 0.81**, **React 19**, **TypeScript** (strict)
- **Expo Router 6** (dosya tabanlı routing)
- **Zustand 5** + `zustand/middleware` `persist` + `@react-native-async-storage/async-storage`
- `react-native-deck-swiper`, `react-native-confetti-cannon`
- Dokunsal geri bildirim: `expo-haptics`

Yalnızca **build zamanında** kullanılan, runtime'da gerekli olmayan araçlar:

- **Datamuse API** — synonym/antonym (`scripts/fetchSynonyms.js`) ve sözcük türü (`scripts/fetchPOS.js`) için bir kez çekilir; sonuç JSON verisine işlenir. Çalışma anında API çağrısı yapılmaz.

---

## Gereksinimler

- **Node.js** 18 veya 20 LTS
- **npm** (proje lockfile'ı npm kullanır)
- Android için: **Android Studio**, **Android SDK** (PATH'te `adb`), **JDK 17 veya 21**
- iOS için: macOS + Xcode (bu repoda iOS henüz doğrulanmadı)

---

## Hızlı Başlangıç

```bash
# bağımlılıkları yükle
npm install

# bağlı cihaz veya emülatörde çalıştır (managed Expo)
npx expo start
```

Sonra Android için `a`'ya bas (emülatör açık veya cihaz `adb` ile bağlı olmalı) ya da **Expo Go** ile QR'ı tara.

> Not: Geliştirme için Expo Go yeterlidir. **Bağımsız kurulabilir APK** üretmek için aşağıdaki adımları izleyin.

---

## Yerel APK Üretme (Android)

Metro/Expo Go gerektirmeden çalışan gerçek, kurulabilir bir `.apk` üretir.

```powershell
# 1) Android SDK ve adb PATH'te olsun (Windows örneği)
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"

# 2) Native android/ klasörünü oluştur (her temiz klonda bir kez)
npx expo prebuild --platform android

# 3) Debug imzasıyla release APK build et
cd android
.\gradlew assembleRelease
cd ..

# 4) Bağlı cihaza kur
adb devices                              # cihazları listele
adb -s <cihaz-id> install -r android\app\build\outputs\apk\release\app-release.apk
```

APK şu konumda oluşur:

```
android/app/build/outputs/apk/release/app-release.apk
```

> İlk Gradle build ~5–15 dakika sürer (bağımlılık çözümleme). Sonraki build'ler çok daha hızlıdır.

---

## Uygulama Akışı

```
Ana Ekran (seviye + chapter grid)
   ├── Find My Level     → 10 soruluk vocab testi → sonuç + cevap incelemesi → "Recommended: B1" rozeti
   ├── Review Hard Words (N)  → zor işaretlenen kelimeleri swipe ile tekrar et
   └── Chapter
        ├── Flashcard (5)  → Eşleştirme (5)
        ├── Flashcard (5)  → Eşleştirme (5)
        ├── Flashcard (5)  → Eşleştirme (5)
        ├── Success ekranı (konfeti)
        └── Reading (chapter'ın 15 kelimesini içeren tema çerçeveli mini hikaye)
              └── FINISH CHAPTER  → chapter'ı yeşil işaretler, ana ekrana döner
```

---

## Dizin Yapısı

```
app/                  Expo Router ekranları
  _layout.tsx           Kök Stack kaydı
  index.tsx             Ana ekran (seviyeler + chapter'lar + review/test butonları)
  flashcards.tsx        Swipe desti (5'er kartlık mini-turlar)
  matching.tsx          Eşleştirme mini oyunu
  success.tsx           Chapter bitiş ekranı (konfeti)
  reading.tsx           Tema çerçeveli okuma + FINISH CHAPTER
  review.tsx            Zor kelimeler tekrar modu
  onboarding.tsx        Find My Level seviye testi

assets/
  bee.png               Ana ekran illüstrasyonu
  images/               Uygulama ikonları, splash, adaptive icon'lar
  data/
    A1.json … C1.json   Kelime verisi (5 × 900) + gömülü reading'ler (5 × 60)
    placement.json      100 soruluk yerleştirme bankası
    seviye_kelimeleri/  Kaynak Oxford PDF'leri (yeniden üretim için saklanır)

store/
  useVocabularyStore.ts Zustand store + kalıcı state

utils/
  wordHelper.ts         Chapter/grup yardımcıları, ID lookup, reading okuyucu
  placement.ts          Dengeli soru seçimi (2/seviye) + puanlama

hooks/                  Color scheme hook'u (root layout kullanıyor)
scripts/                Veri üretim pipeline'ı (aşağıda)
android/                Native proje (npx expo prebuild ile üretilir)
```

---

## Veri Üretim Pipeline'ı (scripts/)

Tüm script'ler **deterministic ve güvenli olduğu yerlerde idempotent**'tır; JSON verisini kaynaktan yeniden üretmek için varlar.

| Script | Amaç | Ne zaman çalıştırılır |
|---|---|---|
| `buildWords.js` | PDF'den çıkarılan metni parse eder → A1…C1 JSON üretir (her biri 900), eksikleri `manualWords.js`'ten tamamlar | PDF veya manuel ekleme güncellenince |
| `manualWords.js` | Bir seviyenin PDF'inde 900 benzersiz kelime yoksa, açığı kapatan elle eklenen kelimeler | Manuel eklemelerin kaynağı |
| `shuffleWords.js` | Deterministic Fisher–Yates shuffle (seviye başına sabit seed) — chapter'ların alfabetik kalmaması için | `buildWords.js`'ten sonra **bir kez**. ⚠️ Idempotent değil — tekrar çalıştırırsanız yeniden karışır |
| `verifyShuffle.js` | Kabul kontrolü: her seviye 60×15, duplicate yok, baş harfler karışık | Shuffle'dan sonra |
| `fetchPOS.js` | Her kelimenin sözcük türünü Datamuse'tan çeker (cache'li) | Bir kez (cache: `.cache/pos.json`) |
| `buildSentences.js` | Her kelimeye POS uyumlu şablon örnek cümle üretir | POS çekiminden sonra |
| `fetchSynonyms.js` | Datamuse'tan synonym/antonym; sıkı filtre + kara liste ile | Bir kez (cache: `.cache/datamuse.json`) |
| `auditSynonyms.js` | Synonym/antonym çiftleri için çift yönlü + POS denetimi | Çekim sonrası / temizlik için |
| `buildReadings.js` | Her chapter için 15 kelimesinden tema çerçeveli reading üretir | Kelime verisi kesinleşince |
| `verifyReadings.js` | Kapsama + uzunluk + yasaklı kalıp denetimi | Reading üretiminden sonra |
| `auditReadings.js` | Gramer denetimi (artikel, iyelik, kısaltma, sayı) | Reading üretiminden sonra |
| `buildPlacement.js` | Gerçek kelime verisinden 100 soruluk placement bankı üretir | Bir kez / kelime verisi değişince |
| `reset-project.js` | (Expo şablonundan miras) `app/` klasörünü sıfırlar — **güvenle silinebilir** |

Reading sistemi için tam dokümantasyon: [READING_CHECKPOINT.md](READING_CHECKPOINT.md).

---

## Kalıcı State

`AsyncStorage`'da (anahtar: `vocabulary-storage`) Zustand `persist.partialize` ile saklanan alanlar:

- `userLevel` — Find My Level'den önerilen seviye
- `placementResult` — son test sonucu (cevaplar, puan, completedAt) — incelemek için
- `completedChapters` — `{ 'A2-11': true, ... }` — yeşil chapter butonları için
- `failedWords` — `{ 'A1-12-3': 2, ... }` — review modu için
- `streak`, `lastStreakDate` — günlük streak
- `hasSeenSwipeTutorial` — tek seferlik öğretici bayrağı

Aktif chapter verisi (mevcut deste, grup indeksi, reading text) yalnızca RAM'de tutulur.

---

## NPM Komutları

```bash
npm start         # expo start
npm run android   # expo run:android (build + kurulum)
npm run ios       # expo run:ios
npm run web       # expo start --web
npm run lint      # expo lint (ESLint + expo config)
```

---

## Lisans

Henüz belirtilmedi. Küçük projeler için MIT yaygın bir tercihtir.
