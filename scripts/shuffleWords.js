/*
 * shuffleWords.js — Her level'in kelimelerini DETERMINISTIC (sabit seed'li) karıştırır.
 *
 * Neden: Oxford listeleri alfabetik. Bu yüzden bir chapter'ın 15 kelimesi aynı harften
 * gelir (A2 Ch.11 = condition, conference, connect, consider...). Bu hem monoton hem
 * reading'i yapaylaştırıyor. Karıştırma chapter'lara çeşitli harfler/anlam alanları getirir.
 *
 * Kurallar:
 *  - Level sınırı korunur: A1/A2/B1/B2/C1 birbirine karışmaz.
 *  - Karıştırma her level'in KENDİ içinde yapılır.
 *  - ID kelimeyle birlikte taşınır (her kelime orijinal id'sini korur) → failedWords güvenli.
 *  - DETERMINISTIC: sabit seed → her build aynı dağılımı üretir (progress bozulmaz).
 *  - Toplam yapı korunur: 60 chapter × 15 kelime.
 *
 * Çalıştırma: node scripts/shuffleWords.js [--dry]
 *
 * ⚠️ DİKKAT — BU SCRIPT İDEMPOTENT DEĞİLDİR, BİR KEZ ÇALIŞTIRILIR:
 *   Zaten karıştırılmış JSON'a tekrar çalıştırılırsa veriyi YENİDEN karıştırır ve
 *   chapter dağılımı değişir (kullanıcı progress'i bozulur). Determinism "aynı GİRDİ +
 *   aynı seed → aynı çıktı" demektir; girdi (JSON sırası) bir kez değiştiği için tekrar
 *   çalıştırmak farklı sonuç verir. Dağılımı bilerek değiştirmek istersen önce JSON'ları
 *   buildWords.js ile orijinal (alfabetik) haline döndür, SONRA bu script'i çalıştır.
 *
 * NOT: Cümle/reading tutarlılığı: sentence alanları kelimeyle birlikte taşınır
 * (cümle kelimeye bağlı, pozisyona değil), bu yüzden shuffle onları bozmaz.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'assets', 'data');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const DRY = process.argv.includes('--dry');

// Versiyon: seed'in parçası. Dağılımı bilerek değiştirmek istersen v1 → v2 yap.
const SHUFFLE_VERSION = 'v1';

// 32-bit string hash (FNV-1a benzeri) → sayısal seed
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// mulberry32: sabit seed'den deterministic 0..1 üreteç
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic Fisher-Yates: aynı seed → aynı sonuç
function deterministicShuffle(array, seedString) {
  const rng = mulberry32(hashSeed(seedString));
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function main() {
  for (const lvl of LEVELS) {
    const p = path.join(DATA_DIR, lvl + '.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const before = j.words.map(w => w.word);

    // Level'in kendi içinde, sabit seed ile karıştır (ID kelimeyle birlikte taşınır)
    j.words = deterministicShuffle(j.words, `word-order-${lvl}-${SHUFFLE_VERSION}`);

    const after = j.words.map(w => w.word);
    // değişti mi kontrolü (ilk 5)
    const changed = before.slice(0, 5).join(',') !== after.slice(0, 5).join(',');

    if (!DRY) fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n', 'utf-8');
    console.log(`${lvl}: ${j.words.length} kelime karıştırıldı (seed: word-order-${lvl}-${SHUFFLE_VERSION}) ${changed ? '✓ sıra değişti' : ''}`);
  }
  console.log(DRY ? '\n(--dry: yazılmadı)' : '\n✓ Kelimeler deterministic olarak karıştırıldı.');
}

main();
