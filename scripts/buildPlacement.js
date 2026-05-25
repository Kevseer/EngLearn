/*
 * buildPlacement.js — Seviye tespit (placement) soru bankasını GERÇEK kelime verisinden üretir.
 *
 * Neden: Eski onboarding grammar testiydi ve uygulamanın vocabulary mantığından kopuktu.
 * Bu script, mevcut A1-C1 kelime JSON'larından (doğrulanmış çevirilerle) vocabulary-odaklı
 * sorular üretir → "bu seviye gerçekten bu kelime sisteminden çıktı" hissi.
 *
 * Üretilen: assets/data/placement.json
 *   - Her seviye için 20 soru (toplam 100)
 *   - Tipler: meaning_en_to_tr, meaning_tr_to_en (≈%70), gap_fill (≈%30)
 *   - Her soru: 1 doğru + 3 çeldirici (aynı seviyeden, çakışmasız)
 *
 * Halüsinasyon YOK: tüm içerik gerçek kelime verisinden, deterministic seed ile.
 *
 * Çalıştırma: node scripts/buildPlacement.js [--dry]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'assets', 'data');
const POS_FILE = path.join(ROOT, '.cache', 'pos.json');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const PER_LEVEL = 20;
const DRY = process.argv.includes('--dry');

const pos = JSON.parse(fs.readFileSync(POS_FILE, 'utf-8'));

// Deterministic PRNG (her build aynı bankayı üretir)
function hashSeed(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const FUNC = new Set(['about','above','across','after','and','but','or','the','a','an','i','you','he','she','it','we','they','shall','may','will','can','must','should','would','could','might','this','that','not','very','too','also','here','there','instead','somewhere','abroad','else','such','own']);

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// Bir seviyenin soru-uygun kelimelerini döndür
function eligibleWords(words) {
  return words.filter(w => {
    const tr = (w.translation || '').trim();
    if (!tr) return false;
    if (tr.split(/\s+/).length > 2) return false;     // çok uzun çeviri eleme
    if (FUNC.has(w.word.toLowerCase())) return false;  // fonksiyon kelimesi değil
    return true;
  });
}

// Çeldirici seç: aynı havuzdan, doğru cevapla ve birbirleriyle çakışmayan N değer
function pickDistractors(pool, correct, n, keyFn, rng) {
  const seen = new Set([correct.toLowerCase()]);
  const out = [];
  let guard = 0;
  while (out.length < n && guard < pool.length * 4) {
    guard++;
    const cand = pool[Math.floor(rng() * pool.length)];
    const val = keyFn(cand);
    if (!val) continue;
    const k = val.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(val);
  }
  return out;
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function buildLevel(level, words) {
  const rng = mulberry32(hashSeed(`placement-${level}-v1`));
  const pool = eligibleWords(words);
  // gap_fill için: POS fiil/isim/sıfat ve cümlede kelime geçen
  const gapPool = pool.filter(w => {
    const p = pos[w.word.toLowerCase()];
    return (p === 'v' || p === 'n' || p === 'adj') && w.sentence && w.sentence.toLowerCase().includes(w.word.toLowerCase());
  });

  // 20 soru: 14 meaning (7 en→tr, 7 tr→en) + 6 gap_fill
  const questions = [];
  const usedWords = new Set();

  function takeWord(fromPool) {
    let guard = 0;
    while (guard < fromPool.length * 4) {
      guard++;
      const w = fromPool[Math.floor(rng() * fromPool.length)];
      if (!usedWords.has(w.word.toLowerCase())) { usedWords.add(w.word.toLowerCase()); return w; }
    }
    return null;
  }

  let idx = 0;
  // 7 meaning_en_to_tr
  for (let i = 0; i < 7; i++) {
    const w = takeWord(pool); if (!w) break;
    const distractors = pickDistractors(pool, w.translation, 3, c => c.translation, rng);
    if (distractors.length < 3) continue;
    const options = shuffle([capitalize(w.translation), ...distractors.map(capitalize)], rng);
    questions.push({
      id: `placement-${level.toLowerCase()}-${String(++idx).padStart(3, '0')}`,
      level, type: 'meaning_en_to_tr', word: w.word,
      question: `What does "${w.word}" mean?`,
      options, answer: capitalize(w.translation),
    });
  }
  // 7 meaning_tr_to_en
  for (let i = 0; i < 7; i++) {
    const w = takeWord(pool); if (!w) break;
    const distractors = pickDistractors(pool, w.word, 3, c => c.word, rng);
    if (distractors.length < 3) continue;
    const options = shuffle([capitalize(w.word), ...distractors.map(capitalize)], rng);
    questions.push({
      id: `placement-${level.toLowerCase()}-${String(++idx).padStart(3, '0')}`,
      level, type: 'meaning_tr_to_en', word: w.word,
      question: `Which word means "${w.translation}"?`,
      options, answer: capitalize(w.word),
    });
  }
  // 6 gap_fill
  for (let i = 0; i < 6; i++) {
    const w = takeWord(gapPool); if (!w) break;
    const distractors = pickDistractors(gapPool, w.word, 3, c => c.word, rng);
    if (distractors.length < 3) continue;
    // cümlede kelimeyi boşlukla değiştir (case-insensitive, ilk geçiş)
    const re = new RegExp(w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const gapped = w.sentence.replace(re, '____');
    const options = shuffle([w.word.toLowerCase(), ...distractors.map(d => d.toLowerCase())], rng);
    questions.push({
      id: `placement-${level.toLowerCase()}-${String(++idx).padStart(3, '0')}`,
      level, type: 'gap_fill', word: w.word,
      question: gapped,
      options, answer: w.word.toLowerCase(),
    });
  }

  return questions;
}

function main() {
  const bank = { version: 'v1', questions: [] };
  for (const level of LEVELS) {
    const words = JSON.parse(fs.readFileSync(path.join(DATA_DIR, level + '.json'), 'utf-8')).words;
    const qs = buildLevel(level, words);
    bank.questions.push(...qs);
    console.log(`${level}: ${qs.length} soru (hedef ${PER_LEVEL})`);
  }
  if (!DRY) fs.writeFileSync(path.join(DATA_DIR, 'placement.json'), JSON.stringify(bank, null, 2) + '\n', 'utf-8');
  console.log(`\nToplam: ${bank.questions.length} soru` + (DRY ? ' (--dry: yazılmadı)' : ' → assets/data/placement.json'));
}

main();
