/*
 * buildReadings.js — Her chapter için template-tabanlı mini hikaye (reading) üretir.
 *
 * Yaklaşım: "her kelime için bağımsız cümle" değil, "her chapter için ÇERÇEVELİ SAHNE".
 *   - Tema, chapter numarasına göre deterministic seçilir (giriş + kapanış cümlesi = çerçeve).
 *   - 15 kelime POS'a göre güvenli slot kalıplarına yerleştirilir; hepsi temaya bağlıdır.
 *   - Jenerik kalıplar ("This is a X that everyone knows") ve riskli cümleler ("I want to
 *     hurt right now") ÜRETİLMEZ. Riskli fiiller özel güvenli kalıp alır.
 *
 * Build-time: üretilen reading her seviyenin JSON'una `readings[chapterIndex]` olarak gömülür.
 * Runtime'da wordHelper.getChapterReading bunu doğrudan okur (hesaplama yok).
 *
 * Halüsinasyon YOK: tüm cümleler sabit şablonlardan, kelime sadece doğru slota yerleşir.
 *
 * Çalıştırma: node scripts/buildReadings.js [--dry]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'assets', 'data');
const POS_FILE = path.join(ROOT, '.cache', 'pos.json');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const CHAPTER_SIZE = 15;
const DRY = process.argv.includes('--dry');

const pos = JSON.parse(fs.readFileSync(POS_FILE, 'utf-8'));

// ---- Deterministic PRNG (chapter'a göre sabit tema/varyant seçimi) ----
function hashSeed(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- Tema çerçeveleri: giriş + kapanış (sahne kurar) ----
const THEMES = [
  { id: 'school_project', open: 'Today, our class worked on a small project together.', close: 'In the end, we were happy with our work.' },
  { id: 'family_day', open: 'It was a calm day at home with my family.', close: 'We all felt close and content by the evening.' },
  { id: 'city_walk', open: 'We went for a long walk around the city.', close: 'We walked back home slowly, tired but glad.' },
  { id: 'small_trip', open: 'My friends and I planned a short trip.', close: 'The trip was simple, but we enjoyed every part.' },
  { id: 'class_presentation', open: 'Our teacher asked us to give a class presentation.', close: 'Everyone listened, and we finished without trouble.' },
  { id: 'market_day', open: 'On market day, the streets were full of people.', close: 'We went home with our bags and many stories.' },
  { id: 'lost_item', open: 'In the morning, I noticed something was missing.', close: 'After a long search, the day became calm again.' },
  { id: 'team_task', open: 'Our team had an important task to finish.', close: 'We worked step by step until it was done.' },
  { id: 'kitchen_day', open: 'We spent the afternoon cooking in the kitchen.', close: 'The meal was ready, and we sat down to eat.' },
  { id: 'museum_visit', open: 'We visited a quiet museum near the center.', close: 'We left the museum with many new ideas.' },
  { id: 'travel_plan', open: 'We sat together to make a travel plan.', close: 'By night, the plan was clear and ready.' },
  { id: 'rainy_day', open: 'It rained all day, so we stayed inside.', close: 'When the rain stopped, the sky looked fresh.' },
];

// ---- Riskli fiiller: zararlı/garip olmayan özel güvenli kalıp ----
const RISKY_VERBS = {
  hurt: w => `Nobody wanted to ${w} anyone, so we were careful.`,
  kill: w => `In the story, the hero had to ${w} the dragon.`,
  hit: w => `By accident, the ball did ${w} the wall.`,
  fight: w => `The two friends did not want to ${w}, so they talked instead.`,
  die: w => `In the old tale, the plant began to ${w} without water.`,
  attack: w => `In the game, the team had to ${w} the castle.`,
  shoot: w => `In the film, the camera began to ${w} a new scene.`,
  burn: w => `We were careful not to ${w} the food on the stove.`,
  break: w => `We tried not to ${w} the old chair while moving it.`,
  beat: w => `Our team hoped to ${w} the others in the game.`,
};

// ---- POS slot kalıpları (temaya bağlı, jenerik/riskli değil) ----
// Birden çok kalıp → tekdüzelik önlenir (rng ile seçilir).
const SLOTS = {
  // İsim kalıpları: somut/soyut ayırt etmeden DOĞAL duran, nötr ifadeler
  n: [
    w => `We wrote the word "${w}" in our notebook.`,
    w => `The ${w} was an important part of the day.`,
    w => `We talked quietly about the ${w}.`,
    w => `Someone mentioned ${art(w)} ${w} during the day.`,
    w => `The idea of ${art(w)} ${w} came up while we talked.`,
  ],
  // İki ismi tek cümlede birleştiren kalıp (cümle sayısını düşürür, daha akıcı)
  nPair: [
    (a, b) => `While we talked, someone mentioned ${art(a)} ${a} and also ${art(b)} ${b}.`,
    (a, b) => `The ${a} and the ${b} were both part of our notes that day.`,
    (a, b) => `First we noticed ${art(a)} ${a}, and then we saw ${art(b)} ${b} nearby.`,
  ],
  v: [
    w => `We tried to ${w} during the activity.`,
    w => `The teacher asked us to ${w} with care.`,
    w => `Together, we began to ${w} slowly.`,
    w => `It was not easy to ${w}, but we kept going.`,
    w => `Everyone helped to ${w} at the right time.`,
  ],
  // İki fiili tek cümlede birleştir (cümle sayısını düşürür)
  vPair: [
    (a, b) => `During the day, we had to ${a} and then ${b} all together.`,
    (a, b) => `It became our job to ${a} first and then to ${b} carefully.`,
    (a, b) => `At first we tried to ${a}, and a little later we began to ${b}.`,
  ],
  adj: [
    w => `The moment felt ${w} to all of us.`,
    w => `The room looked ${w} that afternoon.`,
    w => `Everything seemed ${w} after the news.`,
    w => `It was a ${w} part of the day.`,
  ],
  // İki sıfatı tek cümlede birleştir
  adjPair: [
    (a, b) => `For a moment, the whole day felt ${a} and ${b} at the same time.`,
    (a, b) => `Everything around us looked ${a} and just a little ${b}.`,
    (a, b) => `In the end, it was a ${a} and ${b} moment for all of us.`,
  ],
  adv: [
    w => `We finished that part ${w}.`,
    w => `She answered ${w} and went on.`,
    w => `Things moved ${w} from there.`,
    w => `We worked ${w} until the end.`,
  ],
  func: [
    w => `We even used the small word "${w}" while talking.`,
    w => `Someone wrote "${w}" on the board as an example.`,
    w => `We practiced the word "${w}" out loud.`,
  ],
  // Sayı kelimeleri: sıfat/isim slotunda komik durur ("felt ninety"), özel kalıp
  num: [
    w => `We even counted up to ${w} at one point.`,
    w => `The number "${w}" came up while we worked.`,
    w => `Someone wrote the number "${w}" on the board.`,
  ],
};

// Sayılamaz isimler — "a/an" almaz, "some" alır
const UNCOUNTABLE = new Set([
  'advice','information','news','furniture','luggage','equipment','homework','knowledge','money','music',
  'water','air','rice','bread','milk','tea','coffee','sugar','salt','butter','cheese','electricity','traffic',
  'weather','health','help','work','research','progress','energy','food','fun','love','peace','nature','culture',
  'art','history','geography','science','smoke','grass',
  // veride bulunan ek sayılamazlar (auditReadings ile tespit edildi)
  'anger','cold','content','cotton','cream','darkness','data','dirt','dust','exercise','fear','feedback','flour',
  'gold','hardware','heat','honey','hope','ice','jam','jewellery','joy','juice','light','luck','machinery','metal',
  'mud','noise','oil','paper','plastic','rain','rest','sand','shopping','silver','sleep','snow','software','soup',
  'stress','wind','wood','wool','glass',
]);
const FUNCTION_WORDS = new Set([
  // prepozisyon / bağlaç
  'about','above','across','after','against','along','among','around','at','before','behind','below','beneath','beside','between','beyond','by','down','during','except','for','from','in','inside','into','near','of','off','on','onto','out','outside','over','past','through','to','toward','under','until','up','upon','with','within','without','and','but','or','so','yet','nor','because','although','though','while','whereas','unless',
  // zamir / iyelik (ASLA "a/an" almaz)
  'i','you','he','she','it','we','they','me','him','us','them','this','that','these','those','who','whom','whose','which','what','where','when','why','how',
  'my','your','his','her','its','our','their','mine','yours','hers','ours','theirs','myself','yourself','himself','herself','itself','ourselves','themselves',
  // belirteç / niceleyici
  'the','a','an','some','any','each','every','all','both','either','neither','not','very','too','also','just','only','even','still','already','again','here','there','cannot','shall','instead','somewhere','abroad','else','such','own','more','most','less','few','many','much','several',
  // ay / gün adları (özel isim — artikel almaz)
  'january','february','march','april','may','june','july','august','september','october','november','december',
  'monday','tuesday','wednesday','thursday','friday','saturday','sunday',
  // selamlama / ünlem / nezaket (isim slotunda garip durur)
  'hello','goodbye','hi','bye','yes','no','okay','ok','please','thanks','thank','welcome','sorry','dear','oh',
  // modal / yardımcı fiiller — verb slotuna düşüp "try to ought" üretmemeli
  'ought','must','should','would','could','may','might','shall','will','can',
]);

function art(word) {
  if (UNCOUNTABLE.has(word.toLowerCase())) return 'some';
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

// Sayı kelimeleri (sıfat/isim slotunda "felt ninety" gibi komik durur → özel kalıp)
const NUMBERS = new Set(['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety','hundred','thousand','million','billion','first','second','third','fourth','fifth','zero']);

function classify(word) {
  const w = word.toLowerCase();
  if (NUMBERS.has(w)) return 'num';
  if (FUNCTION_WORDS.has(w)) return 'func';
  const p = pos[w] || 'unknown';
  if (p === 'n' || p === 'v' || p === 'adj' || p === 'adv') return p;
  return 'n'; // bilinmeyen -> isim gibi davran (en güvenli)
}

// Bir kelime için tema-bağlı güvenli cümle üret
function sentenceFor(word, rng) {
  const w = word.toLowerCase();
  if (RISKY_VERBS[w]) return RISKY_VERBS[w](w);
  const key = classify(word);
  const pool = SLOTS[key] || SLOTS.n;
  return pool[Math.floor(rng() * pool.length)](w);
}

function buildReading(words, level, chapter) {
  const rng = mulberry32(hashSeed(`reading-${level}-${chapter}-v1`));
  const theme = THEMES[Math.floor(rng() * THEMES.length)];

  // Kelimeleri türe göre ayır. İsim/fiil/sıfatı ÇİFT halinde birleştirerek cümle
  // sayısını 8-12'ye indiririz (15 ayrı cümle çok uzun ve tekdüze olurdu).
  const nouns = [], verbs = [], adjs = [], rest = []; // rest: zarf/func/riskli → tek cümle
  for (const wObj of words) {
    const w = wObj.word.toLowerCase();
    if (RISKY_VERBS[w]) { rest.push(wObj); continue; }
    const key = classify(wObj.word);
    if (key === 'n') nouns.push(wObj);
    else if (key === 'v') verbs.push(wObj);
    else if (key === 'adj') adjs.push(wObj);
    else rest.push(wObj); // adv, func
  }

  const middle = [];
  // Aynı türden kelimeleri ikişerli birleştiren yardımcı; tek kalanı tekli kalıba düşürür
  function emitPaired(list, pairPool, singlePool) {
    for (let i = 0; i < list.length; i += 2) {
      if (i + 1 < list.length) {
        const t = pairPool[Math.floor(rng() * pairPool.length)];
        middle.push(t(list[i].word.toLowerCase(), list[i + 1].word.toLowerCase()));
      } else {
        const t = singlePool[Math.floor(rng() * singlePool.length)];
        middle.push(t(list[i].word.toLowerCase()));
      }
    }
  }
  emitPaired(nouns, SLOTS.nPair, SLOTS.n);
  emitPaired(verbs, SLOTS.vPair, SLOTS.v);
  emitPaired(adjs, SLOTS.adjPair, SLOTS.adj);

  // Kalanlar (zarf/func/riskli) tek cümle — sayıları az
  let lastTemplate = '';
  for (const wObj of rest) {
    let s = sentenceFor(wObj.word, rng);
    let guard = 0;
    while (s.slice(0, 12) === lastTemplate && guard < 3) { s = sentenceFor(wObj.word, rng); guard++; }
    lastTemplate = s.slice(0, 12);
    middle.push(s);
  }

  const text = [theme.open, ...middle, theme.close].join(' ');
  const translation = words.map(w => `${w.word} = ${w.translation}`).join(' · ');

  return {
    chapter,
    theme: theme.id,
    title: `${level} Chapter ${chapter} - Reading Practice`,
    text,
    translation,
  };
}

function main() {
  for (const lvl of LEVELS) {
    const p = path.join(DATA_DIR, lvl + '.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const chapters = Math.ceil(j.words.length / CHAPTER_SIZE);
    const readings = [];
    for (let c = 1; c <= chapters; c++) {
      const words = j.words.slice((c - 1) * CHAPTER_SIZE, (c - 1) * CHAPTER_SIZE + CHAPTER_SIZE);
      readings.push(buildReading(words, lvl, c));
    }
    j.readings = readings;
    if (!DRY) fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n', 'utf-8');
    console.log(`${lvl}: ${readings.length} reading üretildi`);
  }
  console.log(DRY ? '\n(--dry: yazılmadı)' : '\n✓ Reading\'ler JSON\'a gömüldü.');
}

main();
