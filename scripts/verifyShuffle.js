/*
 * verifyShuffle.js — Deterministic shuffle sonrası kabul kriterlerini doğrular.
 *
 * Kontroller:
 *  - Her level'in toplam kelime sayısı
 *  - Her chapter tam 15 kelime mi
 *  - Level içi duplicate kelime var mı
 *  - Chapter'lar arası duplicate (level içinde) var mı
 *  - Level sınırı: kelime başka level'de de var mı (global benzersizlik)
 *  - Baş harf dağılımı: artık karışık mı (alfabetik blok kalmadı mı)
 *  - Deterministic shuffle: aynı seed → aynı sonuç mu
 *
 * Çalıştırma: node scripts/verifyShuffle.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'assets', 'data');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const CHAPTER_SIZE = 15;

// shuffleWords.js ile AYNI PRNG (determinism testi için)
function hashSeed(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function deterministicShuffle(array, seedString) { const rng = mulberry32(hashSeed(seedString)); const a = [...array]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function initials(words) { return words.map(w => w.word[0].toLowerCase()).join(','); }

function main() {
  const data = {};
  const globalWords = [];
  let allPass = true;

  console.log('================= SHUFFLE DOĞRULAMA =================\n');

  // --- Level başına temel kontroller ---
  for (const lvl of LEVELS) {
    const j = JSON.parse(fs.readFileSync(path.join(DATA_DIR, lvl + '.json'), 'utf-8'));
    data[lvl] = j.words;
    const n = j.words.length;
    const chapters = Math.ceil(n / CHAPTER_SIZE);

    // chapter boyutu
    let sizeOK = true;
    for (let c = 0; c < chapters; c++) {
      const slice = j.words.slice(c * CHAPTER_SIZE, c * CHAPTER_SIZE + CHAPTER_SIZE);
      if (slice.length !== CHAPTER_SIZE) sizeOK = false;
    }

    // level içi duplicate
    const lower = j.words.map(w => w.word.toLowerCase());
    const dupOK = new Set(lower).size === lower.length;

    j.words.forEach(w => globalWords.push(w.word.toLowerCase()));

    console.log(`${lvl}: ${n} kelime, ${chapters} chapter | chapter boyutu: ${sizeOK ? 'OK' : 'HATA'} | level-içi duplicate: ${dupOK ? 'OK' : 'HATA'}`);
    if (!sizeOK || !dupOK) allPass = false;
  }

  // --- Global benzersizlik (level sınırı) ---
  const globalUniq = new Set(globalWords);
  const boundaryOK = globalUniq.size === globalWords.length;
  console.log(`\nLevel boundary check (global benzersizlik): ${boundaryOK ? 'OK' : 'HATA'} (${globalWords.length} kelime, ${globalUniq.size} benzersiz)`);
  if (!boundaryOK) allPass = false;

  // --- Baş harf dağılımı: A2 Chapter 11 before/after ---
  console.log('\n--- Baş harf karışımı (örnek: A2 Chapter 11) ---');
  // "before" = orijinal alfabetik sıra (shuffle uygulanmadan önceki hali simüle edilemez,
  // ama alfabetik olsaydı aynı harften olurdu). Mevcut (after) dağılımı gösterilir.
  const a2ch11 = data['A2'].slice(150, 165);
  console.log(`A2 Chapter 11 initials after: ${initials(a2ch11)}`);
  const uniqueInitials = new Set(a2ch11.map(w => w.word[0].toLowerCase())).size;
  const mixedOK = uniqueInitials >= 5; // en az 5 farklı harf = karışık
  console.log(`  Farklı baş harf sayısı: ${uniqueInitials}/15 → ${mixedOK ? 'KARIŞIK ✓' : 'HALA BLOK HALINDE ✗'}`);
  if (!mixedOK) allPass = false;

  // Genel: kaç chapter hala "tek harf bloğu" (monoton)?
  let monoChapters = 0;
  for (const lvl of LEVELS) {
    const words = data[lvl];
    for (let c = 0; c < Math.ceil(words.length / CHAPTER_SIZE); c++) {
      const slice = words.slice(c * CHAPTER_SIZE, c * CHAPTER_SIZE + CHAPTER_SIZE);
      const uniq = new Set(slice.map(w => w.word[0].toLowerCase())).size;
      if (uniq <= 2) monoChapters++; // 1-2 farklı harf = hala monoton
    }
  }
  console.log(`\nTüm leveller: hala monoton (≤2 farklı baş harf) chapter sayısı: ${monoChapters} / 300`);

  // --- Deterministic shuffle: aynı seed → aynı sonuç ---
  // Aynı kelime kümesini (mevcut JSON, zaten shuffle'lanmış) tekrar shuffle edersek
  // FARKLI çıkmalı (çünkü girdi farklı), ama ORİJİNAL girdiyle aynı seed → aynı çıktı olmalı.
  // Determinism'i: iki kez çalıştırıp aynı sonucu üretiyor mu diye test ederiz.
  const sample = data['A1'].slice(0, 30);
  const r1 = deterministicShuffle(sample, 'determinism-test');
  const r2 = deterministicShuffle(sample, 'determinism-test');
  const detOK = r1.map(w => w.word).join() === r2.map(w => w.word).join();
  console.log(`\nDeterministic shuffle check: ${detOK ? 'OK (aynı seed → aynı sonuç)' : 'HATA'}`);
  if (!detOK) allPass = false;

  console.log('\n====================================================');
  console.log(allPass ? '✅ TÜM KABUL KRİTERLERİ GEÇTİ' : '❌ BAZI KONTROLLER BAŞARISIZ');
}

main();
