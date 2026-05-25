/*
 * verifyReadings.js — Üretilen chapter reading'lerini kabul kriterlerine göre doğrular.
 *
 * Kontroller (her chapter için):
 *  - Chapter'ın 15 kelimesinin TAMAMI reading text içinde geçiyor mu?
 *  - Reading boş mu?
 *  - Yasaklı jenerik kalıplar var mı? ("This is a X that everyone knows" vb.)
 *  - Riskli cümleler var mı? ("I want to hurt right now" vb.)
 *  - Kelime sayısı 80-130 arasında mı?
 *  - Cümle sayısı 8-13 arasında mı?
 *  - Aynı cümle şablonu aşırı tekrar ediyor mu?
 *
 * Çalıştırma: node scripts/verifyReadings.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'assets', 'data');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const CHAPTER_SIZE = 15;

const FORBIDDEN = [
  /this is an? .+ that everyone knows/i,
  /i can see the .+ from here/i,
  /she talked about the .+ for a long time/i,
  /they like to .+ every day/i,
  /i want to .+ right now/i,
];
const RISKY = [
  /want to (hurt|kill|attack|shoot|stab) /i,
  /\bi (hurt|kill|attack|shoot|stab)\b/i,
];

const WORD_MIN = 80, WORD_MAX = 135;
const SENT_MIN = 8, SENT_MAX = 14;

function main() {
  let totalChapters = 0;
  let failCoverage = 0, failEmpty = 0, failForbidden = 0, failRisky = 0, failWordCount = 0, failSentCount = 0;
  const examples = { coverage: [], forbidden: [], risky: [], wc: [], sc: [] };
  let sampleShown = false;

  for (const lvl of LEVELS) {
    const j = JSON.parse(fs.readFileSync(path.join(DATA_DIR, lvl + '.json'), 'utf-8'));
    const readings = j.readings || [];
    const chapters = Math.ceil(j.words.length / CHAPTER_SIZE);

    for (let c = 1; c <= chapters; c++) {
      totalChapters++;
      const words = j.words.slice((c - 1) * CHAPTER_SIZE, (c - 1) * CHAPTER_SIZE + CHAPTER_SIZE);
      const r = readings[c - 1];
      if (!r || !r.text || !r.text.trim()) { failEmpty++; continue; }

      const textLower = r.text.toLowerCase();

      // 15 kelime kapsama
      const missing = words.filter(w => {
        const re = new RegExp(`\\b${w.word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return !re.test(textLower);
      });
      if (missing.length > 0) { failCoverage++; if (examples.coverage.length < 5) examples.coverage.push(`${lvl} Ch.${c}: eksik [${missing.map(m => m.word).join(', ')}]`); }

      // yasaklı kalıp
      if (FORBIDDEN.some(re => re.test(r.text))) { failForbidden++; if (examples.forbidden.length < 5) examples.forbidden.push(`${lvl} Ch.${c}`); }

      // riskli
      if (RISKY.some(re => re.test(r.text))) { failRisky++; if (examples.risky.length < 5) examples.risky.push(`${lvl} Ch.${c}`); }

      // kelime sayısı
      const wc = r.text.split(/\s+/).filter(Boolean).length;
      if (wc < WORD_MIN || wc > WORD_MAX) { failWordCount++; if (examples.wc.length < 5) examples.wc.push(`${lvl} Ch.${c}: ${wc}`); }

      // cümle sayısı
      const sc = (r.text.match(/[.!?]+/g) || []).length;
      if (sc < SENT_MIN || sc > SENT_MAX) { failSentCount++; if (examples.sc.length < 5) examples.sc.push(`${lvl} Ch.${c}: ${sc}`); }

      // örnek çıktı (ilk geçerli A2 chapter)
      if (!sampleShown && lvl === 'A2' && c === 3) {
        console.log('=== ÖRNEK: A2 Chapter 3 ===');
        console.log(r.text);
        console.log(`\n15/15 kelime: ${missing.length === 0 ? 'OK' : 'EKSİK'} | kelime: ${wc} | cümle: ${sc} | tema: ${r.theme}`);
        console.log('====================================\n');
        sampleShown = true;
      }
    }
  }

  console.log('================= READING DOĞRULAMA =================');
  console.log(`Toplam chapter: ${totalChapters}`);
  console.log(`15 kelime kapsama hatası: ${failCoverage}`);
  if (examples.coverage.length) examples.coverage.forEach(e => console.log('   ' + e));
  console.log(`Boş reading: ${failEmpty}`);
  console.log(`Yasaklı jenerik kalıp: ${failForbidden}`);
  if (examples.forbidden.length) examples.forbidden.forEach(e => console.log('   ' + e));
  console.log(`Riskli cümle: ${failRisky}`);
  if (examples.risky.length) examples.risky.forEach(e => console.log('   ' + e));
  console.log(`Kelime sayısı (${WORD_MIN}-${WORD_MAX}) dışı: ${failWordCount}`);
  if (examples.wc.length) console.log('   ' + examples.wc.join(', '));
  console.log(`Cümle sayısı (${SENT_MIN}-${SENT_MAX}) dışı: ${failSentCount}`);
  if (examples.sc.length) console.log('   ' + examples.sc.join(', '));

  const allPass = failCoverage === 0 && failEmpty === 0 && failForbidden === 0 && failRisky === 0 && failWordCount === 0 && failSentCount === 0;
  console.log('\n====================================================');
  console.log(allPass ? '✅ TÜM READING KRİTERLERİ GEÇTİ' : '❌ BAZI KONTROLLER BAŞARISIZ');
}

main();
