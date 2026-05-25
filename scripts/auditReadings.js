/*
 * auditReadings.js — Reading'lerin GRAMER/ANLAM kalitesini sistematik tarar.
 * (verifyReadings.js sayıları kontrol eder; bu script kalite sorunlarını arar.)
 *
 * Aranan sorunlar:
 *  - "a/an + iyelik zamiri" (a my, an his) — POS yanlış sınıflandırma
 *  - "a/an + ay/gün adı" (an october) — özel isim isim slotuna girmiş
 *  - "a/an + selamlama/ünlem" (a hello, a goodbye)
 *  - Çift artikel / artikel + sayı
 *  - Bilinen sorunlu kelimelerin isim slotuna düşmesi
 *
 * Çalıştırma: node scripts/auditReadings.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'assets', 'data');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

const POSSESSIVE = ['my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const GREETINGS = ['hello', 'goodbye', 'hi', 'bye', 'yes', 'no', 'okay', 'ok', 'please', 'thanks', 'thank', 'welcome', 'sorry'];
// İsim slotuna düşünce garip olan, aslında isim olmayan/zor kelimeler
const NOT_NOUNS = ['dear', 'still', 'else', 'instead', 'somewhere', 'abroad', 'shall', 'cannot', 'each', 'both', 'such', 'own'];

function scan(label, text, words) {
  const hits = [];
  for (const w of words) {
    const re = new RegExp(`\\b(a|an|some) ${w}\\b`, 'i');
    if (re.test(text)) hits.push(w);
  }
  return hits;
}

function main() {
  const counts = { possessive: 0, month: 0, greeting: 0, notNoun: 0, doubleArticle: 0 };
  const ex = { possessive: [], month: [], greeting: [], notNoun: [], doubleArticle: [] };

  for (const l of LEVELS) {
    const j = JSON.parse(fs.readFileSync(path.join(DATA_DIR, l + '.json'), 'utf-8'));
    for (const r of (j.readings || [])) {
      const t = r.text;
      const tag = `${l} Ch.${r.chapter}`;

      const p = scan('poss', t, POSSESSIVE); if (p.length) { counts.possessive += p.length; if (ex.possessive.length < 10) ex.possessive.push(`${tag}: a ${p.join('/')}`); }
      const m = scan('month', t, MONTHS); if (m.length) { counts.month += m.length; if (ex.month.length < 10) ex.month.push(`${tag}: ${m.join('/')}`); }
      const g = scan('greet', t, GREETINGS); if (g.length) { counts.greeting += g.length; if (ex.greeting.length < 10) ex.greeting.push(`${tag}: ${g.join('/')}`); }
      const n = scan('notNoun', t, NOT_NOUNS); if (n.length) { counts.notNoun += n.length; if (ex.notNoun.length < 10) ex.notNoun.push(`${tag}: ${n.join('/')}`); }
      if (/\b(a|an) (a|an|the) \b/i.test(t)) { counts.doubleArticle++; if (ex.doubleArticle.length < 10) ex.doubleArticle.push(tag); }
    }
  }

  console.log('================= READING GRAMER DENETİMİ =================');
  const report = (name, key) => {
    console.log(`\n${name}: ${counts[key]}`);
    ex[key].forEach(e => console.log('   ' + e));
  };
  report('a/an + iyelik zamiri (a my)', 'possessive');
  report('a/an + ay/gün adı (an october)', 'month');
  report('a/an + selamlama (a hello)', 'greeting');
  report('a/an + isim-olmayan (a dear)', 'notNoun');
  report('çift artikel', 'doubleArticle');

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log('\n==========================================================');
  console.log(total === 0 ? '✅ GRAMER DENETİMİ TEMİZ' : `⚠️ TOPLAM ${total} GRAMER SORUNU BULUNDU`);
}

main();
