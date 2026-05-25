/*
 * buildSentences.js — POS-tabanlı şablon örnek cümleler ve chapter reading paragrafları üretir.
 *
 * Girdi:  assets/data/*.json (kelimeler) + .cache/pos.json (sözcük türleri)
 * Çıktı:  - her kelimenin `sentence` alanı güncellenir (POS'a uygun şablon cümle)
 *         - getChapterReading için kullanılacak reading üretimi wordHelper.ts'e taşınır
 *           (bu script sadece kelime cümlelerini yazar; reading runtime'da üretilir)
 *
 * Halüsinasyon YOK: cümleler sabit dilbilgisi şablonlarından üretilir, kelime sadece
 * doğru gramatik konuma yerleştirilir.
 *
 * Çalıştırma: node scripts/buildSentences.js [--dry]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'assets', 'data');
const POS_FILE = path.join(ROOT, '.cache', 'pos.json');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const DRY = process.argv.includes('--dry');

// İngilizcede sesli harfle başlayan kelimeler için a/an seçimi
function article(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

// Prepozisyon / bağlaç / zamir / belirteç gibi fonksiyon kelimeleri:
// şablon cümleye zorla sokmak bozuk gramer üretir (ör: "He spoke about during...").
// Bunlar için güvenli, nötr bir kalıp kullanılır.
const FUNCTION_WORDS = new Set([
  'about','above','across','after','against','along','among','around','at','before','behind',
  'below','beneath','beside','between','beyond','by','down','during','except','for','from','in',
  'inside','into','near','of','off','on','onto','out','outside','over','past','through','to',
  'toward','under','until','up','upon','with','within','without',
  'and','but','or','so','yet','nor','because','although','though','while','whereas','unless',
  'i','you','he','she','it','we','they','me','him','her','us','them','this','that','these','those',
  'who','whom','whose','which','what','where','when','why','how','myself','yourself','himself',
  'the','a','an','some','any','each','every','all','both','either','neither','much','many','few',
  'not','very','too','also','just','only','even','still','already','yet','again','here','there',
  'cannot','o\'clock',
]);

// Sayılamaz (uncountable) isimler — "a/an" almazlar
const UNCOUNTABLE = new Set([
  'advice','information','news','furniture','luggage','equipment','homework','knowledge','money',
  'music','water','air','rice','bread','milk','tea','coffee','sugar','salt','butter','cheese',
  'electricity','traffic','weather','health','help','work','research','progress','time','space',
  'energy','food','fun','love','peace','nature','culture','art','history','geography','science',
]);

// POS'a göre şablon cümle havuzu. {w} kelimeyle değiştirilir.
// Birden çok kalıp -> reading paragrafı tekdüze olmaz (indeks ile seçilir).
const TEMPLATES = {
  n: [
    w => `I can see the ${w} from here.`,
    w => `She talked about the ${w} for a long time.`,
    w => `This is ${article(w)} ${w} that everyone knows.`,
    w => `We learned about the ${w} at school.`,
  ],
  // Sayılamaz isim: "a/an" ve "the ... that" kalıpları uymaz
  nUncount: [
    w => `We talked about ${w} for a long time.`,
    w => `She needs more ${w} today.`,
    w => `${w[0].toUpperCase() + w.slice(1)} is important to everyone.`,
    w => `They learned about ${w} at school.`,
  ],
  // Fonksiyon kelimesi (prepozisyon/bağlaç/zamir...): güvenli, nötr kalıp
  func: [
    w => `The word "${w}" is common in English.`,
    w => `We often use "${w}" in everyday sentences.`,
    w => `Try to use "${w}" when you speak.`,
    w => `"${w[0].toUpperCase() + w.slice(1)}" appears in many sentences.`,
  ],
  v: [
    w => `They like to ${w} every day.`,
    w => `He will ${w} after lunch.`,
    w => `We need to ${w} together.`,
    w => `I want to ${w} right now.`,
  ],
  adj: [
    w => `The room was very ${w} today.`,
    w => `She felt ${w} after the trip.`,
    w => `It looks ${w} to me.`,
    w => `Everyone was ${w} about the news.`,
  ],
  adv: [
    w => `He spoke ${w} during the meeting.`,
    w => `She finished the work ${w}.`,
    w => `They moved ${w} across the room.`,
    w => `It happened ${w}, as expected.`,
  ],
  unknown: [
    w => `This sentence uses the word "${w}".`,
    w => `Here we see "${w}" in a simple sentence.`,
  ],
};

function buildSentence(word, pos, variant) {
  const w = word.toLowerCase();
  let key;
  if (FUNCTION_WORDS.has(w)) key = 'func';            // prepozisyon/bağlaç/zamir
  else if (pos === 'n' && UNCOUNTABLE.has(w)) key = 'nUncount'; // sayılamaz isim
  else if (TEMPLATES[pos]) key = pos;                  // n/v/adj/adv
  else key = 'unknown';
  const pool = TEMPLATES[key];
  return pool[variant % pool.length](w);
}

function main() {
  const pos = JSON.parse(fs.readFileSync(POS_FILE, 'utf-8'));
  let updated = 0;
  const sampleOut = [];

  for (const lvl of LEVELS) {
    const p = path.join(DATA_DIR, lvl + '.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf-8'));
    j.words.forEach((w, idx) => {
      const wpos = pos[w.word.toLowerCase()] || 'unknown';
      // chapter içindeki konuma göre kalıp çeşitlendir
      const variant = idx % 4;
      w.sentence = buildSentence(w.word, wpos, variant);
      updated++;
      if (lvl === 'A1' && idx < 15) sampleOut.push(`  ${w.word} [${wpos}]: ${w.sentence}`);
    });
    if (!DRY) fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n', 'utf-8');
  }

  console.log(`Güncellenen cümle: ${updated}`);
  console.log('\nA1 Chapter 1 örnek:');
  console.log(sampleOut.join('\n'));
  console.log(DRY ? '\n(--dry: yazılmadı)' : '\n✓ Cümleler güncellendi.');
}

main();
