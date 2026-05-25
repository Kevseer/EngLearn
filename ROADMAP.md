# EngLearn — Düzeltme & Geliştirme Yol Haritası

> Hedef: Kişisel proje, sonrasında yayınlama düşünülüyor.
> Strateji: İyi parçaları koru, kırık akışı ve veri katmanını kökten düzelt.

---

## 0. Doğru Tasarım Sözleşmesi (Tüm işin temeli)

Bir **Chapter = 15 kelime**, **3 mini-tur** halinde işlenir:

```
Chapter (15 kelime)
 ├─ Tur 1: kelime[0..4]   (5 kelime, flashcard) → eşleştirme (bu 5'in)
 ├─ Tur 2: kelime[5..9]   (5 kelime, flashcard) → eşleştirme (bu 5'in)
 ├─ Tur 3: kelime[10..14] (5 kelime, flashcard) → eşleştirme (bu 5'in)
 └─ Reading: 15 kelimenin tamamını bağlamda gösteren hikaye
```

**Kurallar:**
- Eşleştirme: sol = İngilizce, sağ = Türkçe, o turun **5 kelimesi**.
- Sola kaydırma (bilmiyorum): kelime, **kendi 5'li grubunda sağa kaydırılana kadar** tekrar tekrar sorulur. Grup temizlenince eşleştirmeye geçilir.
- Seviye: kullanıcı hangi seviyedeyse o seviyenin kelimeleri.
- Reading amacı: o chapter'da öğrenilen kelimeleri bağlamda pekiştirmek.

**Sabitler:**
- `CHAPTER_SIZE = 15`
- `GROUP_SIZE = 5`
- `GROUPS_PER_CHAPTER = 3`

> ⚠️ Mevcut kod yanlış olarak "15'lik batch × 3 = 45 kelime/chapter" varsayıyor.
> "Siyah ekran" bug'ının kök nedeni budur. Doğrusu: 15 ÷ 5 = 3 grup.

---

## FAZ 1 — Akışı Çalışır Hale Getir (Kritik)

### 1.1 wordHelper.ts — grup mantığı + C2 import düzelt
- [ ] C2.json import'unu kaldır (dosya yok) **veya** boş geçerli C2.json oluştur.
- [ ] Yeni sabitler ekle: `GROUP_SIZE = 5`.
- [ ] `getChapterWords(level, chapter)` 15 kelime döndürmeye devam etsin (doğru).
- [ ] Yeni helper: `getChapterGroups(level, chapter)` → 15 kelimeyi 3×5 gruba böler.

### 1.2 useVocabularyStore.ts — batch yerine grup state'i
- [ ] `batchIndex` → `groupIndex` (0,1,2) olarak yeniden adlandır/anlamlandır.
- [ ] `nextBatch` → `nextGroup` (groupIndex++).
- [ ] `currentBatch` → o turun 5 kelimesi.
- [ ] Chapter başında `groupIndex = 0`.

### 1.3 flashcards.tsx — A1-hardcode + dilimleme düzelt
- [ ] `if (level === 'A1' ...)` koşulunu kaldır → **tüm seviyeler** çalışsın.
- [ ] `words.slice(batchIndex*15, +15)` → `words.slice(groupIndex*5, +5)` (5'li grup).
- [ ] `targetBatchSizeRef` ve "shouldResetIndex" mantığını 5'li gruba göre sadeleştir.
- [ ] Tüm kartlar sağa gidince → eşleştirmeye geç (o turun 5 kelimesiyle).
- [ ] Sola kaydırılanlar → o grup içinde tekrar destesine alınır (mevcut failedCardsRef
      mantığı zaten buna yakın; sadece 5'lik gruba göre çalışacak).

### 1.4 matching.tsx — 5'li grup + tur sonu mantığı
- [ ] `batchIndex >= 2` kontrolü doğru kalıyor (3 grup) ama artık 5'li gruplarla.
- [ ] Karıştırmayı düzelt: `sort(() => Math.random() - 0.5)` yerine Fisher-Yates shuffle.
- [ ] `recordStepResult` çift sayımını gözden geçir (flashcard + matching ikisi de sayıyor).
- [ ] Son grup (groupIndex 2) bitince → success → reading.

### 1.5 _layout.tsx — eksik ekranları kaydet
- [ ] `<Stack.Screen name="reading" ... />` ekle.
- [ ] `<Stack.Screen name="success" ... />` ekle.

### 1.6 Resume yara bandını kaldır
- [ ] Akış düzelince `showResumeOverlay`, `resumeTimerRef`, `handleResume` kaldırılabilir.
      (Önce 1.1–1.4 doğrulanmalı, sonra temizlenmeli.)

**Faz 1 sonunda:** A1 chapter 1 uçtan uca oynanır, siyah ekran biter, A2 de açılır.

---

## FAZ 2 — Veri Katmanı (Yayın için zorunlu)

### 2.1 Bozuk JSON'ları düzelt
- [ ] B1.json — içindeki `// yorum` satırlarını kaldır (geçersiz JSON).
- [ ] B2.json — aynı şekilde, geçerli boş yapıya çevir veya doldur.
- [ ] C1.json — aynı.
- [ ] C2.json — oluştur (yoksa import hatası).

### 2.2 Veri kalitesi
- [ ] A1 (110 kelime): "X / Y in simple terms" şablon tanımları → gerçek tanımlar.
- [ ] A2 (867 kelime): "[i.] [s.] [zf.]" sözlük kısaltmaları → kullanıcı dostu;
      synonyms/opposites boş olanları doldur (opsiyonel).
- [ ] B1/B2/C1/C2: gerçek kelime listeleriyle doldur.
- [ ] Veri şemasını doğrulayan basit bir script ekle (id, word, translation, meanings,
      sentence, synonyms, opposites — hepsi var mı?).

### 2.3 Reading içeriği
- [ ] wordHelper.ts'teki 3 sabit hikaye → her seviye/chapter için bağlama uygun,
      o chapter'ın kelimelerini içeren hikayeler. (Yayın hedefi için önemli.)

---

## FAZ 3 — Eksik/Ölü Özellikler

- [ ] `failedWords` kullanılmıyor → ya spaced-repetition (zor kelimeler tekrar) ile
      anlamlandır, ya da kaldır.
- [ ] Onboarding seviye sonucu hiçbir yere yazılmıyor → store'a `userLevel` ekle,
      sonucu kaydet, ana ekranda öne çıkar.
- [ ] Chapter tamamlanma durumu kaydedilmiyor → "tamamlandı" rozeti / ilerleme.
- [ ] `confetti-cannon` kurulu ama kullanılmıyor → success ekranında kullan veya kaldır.

---

## FAZ 4 — Temizlik & Yayın Hazırlığı

- [ ] Template artıklarını sil: explore.tsx, modal.tsx, hello-wave, parallax-scroll-view,
      collapsible (proje ile alakasız Expo başlangıç şablonu).
- [ ] `test_write.txt` sil.
- [ ] `app.json`: name/slug "Application" → gerçek uygulama adı, ikonlar.
- [ ] `// @ts-ignore` ve `as any` kullanımlarını azalt (tip güvenliği).
- [ ] Git deposu başlat (`git init`), ilk commit.
- [ ] `npm run lint` + TypeScript check temiz olmalı.

---

## Öncelik Sırası (özet)
1. **Faz 1** — akış çalışsın (siyah ekran biter, tüm seviyeler açılır).
2. **Faz 2** — veri (yayın için şart).
3. **Faz 3** — eksik özellikler (kalite).
4. **Faz 4** — temizlik (yayın öncesi).
