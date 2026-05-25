# Reading Sistemi — Checkpoint

> Bu döküman reading (okuma parçası) sisteminin kilitlenmiş halini belgeler.
> Tarih: 2026-05-25 · Durum: ✅ Her iki doğrulama (kriter + gramer) temiz.

---

## 1. Reading Mimarisi

**Yaklaşım:** "Her kelime için bağımsız cümle" değil → **"Her chapter için çerçeveli sahne"**.

```
chapter (15 kelime)
  → tema seç (deterministic, chapter'a göre)        # giriş + kapanış cümlesi = sahne çerçevesi
  → kelimeleri POS'a göre slotlara yerleştir         # isim/fiil/sıfat çiftlenir, zarf/func/sayı tek
  → riskli fiiller özel güvenli kalıp alır            # hurt, kill, fight...
  → giriş + orta cümleler + kapanış = reading text
  → Türkçe taraf: "kelime = anlam" listesi
```

**Üretim zamanı:** Build-time. Reading'ler `scripts/buildReadings.js` ile üretilip her seviyenin
JSON'una `readings[]` dizisi olarak **gömülür**. Runtime'da hesaplama yoktur.

**Runtime okuma:** `utils/wordHelper.ts → getChapterReading(level, chapter)` yalnızca gömülü
`readings[chapter-1]` kaydını okur. Şema: `{ title, text, translation }`.

**UI:** `app/reading.tsx` değişmedi — hâlâ `reading.title / text / translation` kullanır.

**Veri kaynağı:**
- POS (sözcük türü): `.cache/pos.json` (Datamuse `md=p`, build-only).
- Tema havuzu, slot kalıpları, riskli fiiller, sayılamaz/fonksiyon/sayı kelime listeleri:
  hepsi `scripts/buildReadings.js` içinde sabit (halüsinasyonsuz).

---

## 2. Kabul Kriterleri

`scripts/verifyReadings.js` (sayısal) + `scripts/auditReadings.js` (gramer) ikisi birden geçmeli:

| Kriter | Hedef |
|--------|-------|
| 15 kelime kapsama | Her chapter'da 15 kelimenin TAMAMI text içinde geçer |
| Boş reading | 0 |
| Yasaklı jenerik kalıp | 0 (`This is a X that everyone knows` vb.) |
| Riskli cümle | 0 (`I want to hurt right now` vb.) |
| Kelime sayısı | 80–135 (hedef ~80-130) |
| Cümle sayısı | 8–14 |
| `a/an` + iyelik/ay-gün/selamlama | 0 |
| `a` + sayılamaz isim | 0 (→ `some`) |
| Sayı kelimesi sıfat slotunda | 0 (→ özel "num" kalıbı) |
| Çift artikel | 0 |

**Son durum:** 300 chapter, tüm kriterler **0 hata**.

---

## 3. Bilinen Sınırlar

Bunlar template sisteminin **doğal sınırıdır** (gramatik hata değil, tarz/anlam uyumu):

- **Çerçeveli sahne ≠ tam akıcı hikaye.** Tema giriş/kapanış sahneyi kurar; ortadaki cümleler
  aynı sahne içinde ama bağımsız gözlemlerdir. Gerçek bir yazarın hikaye akışı yoktur.
- **POS-anlam uyumsuzluğu (nadir):** `The room looked priceless` gibi cümleler gramatik doğru
  ama anlamca zorlama olabilir. Kelime gerçek bağlamı yerine gramatik slotuna göre yerleşir.
  (Not: modal fiiller `ought/must/should...`, sayılar, fonksiyon kelimeleri özel kategorilere
  alınarak en belirgin uyumsuzluklar giderildi.)
- **Kelimeler temasız:** Bir chapter'da `dolphin, pea, continent` birlikte olabilir (shuffle
  sonucu). Tek doğal olaya örmek imkânsız olduğu için sahne "çerçeve" olarak kalır.
- **Tam doğal kalite için** AI/insan yazımı gerekir; bu, offline + halüsinasyonsuz + build-time
  + 15-kelime-garantili olma hedefleriyle takas edilmiştir.

---

## 4. Yeniden Üretmek İçin Script Sırası

Reading'i sıfırdan yeniden üretmek gerekirse (örn. kelime verisi değişti):

```bash
# 1. (Gerekirse) POS verisi yoksa çek — .cache/pos.json üretir
node scripts/fetchPOS.js

# 2. Reading'leri üret ve JSON'lara göm
node scripts/buildReadings.js

# 3. Sayısal kriterleri doğrula
node scripts/verifyReadings.js        # → "✅ TÜM READING KRİTERLERİ GEÇTİ"

# 4. Gramer kalitesini doğrula
node scripts/auditReadings.js         # → "✅ GRAMER DENETİMİ TEMİZ"
```

**Bağımlılık notu:** `buildReadings.js`, `.cache/pos.json`'a ihtiyaç duyar. Bu cache silinmişse
önce `fetchPOS.js` çalıştırılmalıdır (internet gerektirir; ~4-5 dk).

**Determinism:** Tema/kalıp seçimi sabit seed (`reading-{level}-{chapter}-v1`) ile yapılır.
Aynı kelime girdisi her zaman aynı reading'i üretir → kullanıcı progress'i bozulmaz.
Dağılımı bilerek değiştirmek için seed sonundaki `v1` → `v2` yapılabilir.

---

## İlgili Dosyalar

- `scripts/buildReadings.js` — reading generator (tema, slot, riskli fiil, kelime sınıfları)
- `scripts/verifyReadings.js` — sayısal kabul kriteri doğrulaması
- `scripts/auditReadings.js` — gramer kalite denetimi
- `scripts/fetchPOS.js` — POS (sözcük türü) çekimi
- `utils/wordHelper.ts` — `getChapterReading` (gömülü reading okuyucu)
- `assets/data/{A1..C1}.json` — `readings[]` gömülü
