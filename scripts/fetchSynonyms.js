/*
 * fetchSynonyms.js — Datamuse sözlük API'sinden synonym/opposite (antonym) çeker
 * ve assets/data/*.json kartlarına yazar.
 *
 * Neden Datamuse: ücretsiz, key gerektirmez, WordNet/Moby Thesaurus tabanlı.
 * Halüsinasyon YOK — synonym/opposite gerçek bir sözlük kaynağından gelir, üretilmez.
 *
 * Kalite filtresi:
 *  - Sadece tek kelimelik sonuçlar (boşluk/tire içermeyen)
 *  - Frekans skoru (md=f) >= MIN_FREQ olanlar (nadir/arkaik kelimeler elenir)
 *  - Kelimenin kendisini / aynı kökü içerenler elenir
 *  - Her kelime için en yaygın MAX_RESULTS sonuç
 *
 * Cache: .cache/datamuse.json — tekrar çalıştırınca API'yi yeniden çağırmaz.
 *
 * Çalıştırma:  node scripts/fetchSynonyms.js
 *   --dry         : JSON'a yazmadan sadece rapor
 *   --limit=N     : sadece ilk N kelimeyi işle (test için)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'assets', 'data');
const CACHE_DIR = path.join(ROOT, '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'datamuse.json');

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

// Kalite eşikleri (sıkı filtre — mevcut JSON verisi bu eşikle üretildi)
const MIN_FREQ = 4.0;     // milyonda en az 4 kez görülen kelimeler (nadir/zayıf eşleşmeleri eler)
const MAX_RESULTS = 2;    // kart başına en fazla synonym/opposite (en güçlü eşleşmeler)
const FETCH_MAX = 12;     // API'den çekilecek aday sayısı (filtreden önce)
const DELAY_MS = 60;      // istekler arası bekleme (API'ye nazik olmak için)

// Bilinen yanlış-anlam / argo çöpleri (çok-anlamlılık tuzakları). Bu kelimeler
// synonym/opposite olarak ASLA kullanılmaz — anlam karışıklığı yaratırlar.
// Örn: bread için "loot, lucre, kale" (para argosu), cool için "swresh" vb.
const BLACKLIST = new Set([
  'loot', 'lucre', 'kale', 'pelf', 'boodle', 'dough', 'moolah', 'wampum', 'simoleons', 'clams',
  'bucks', 'scratch', 'gelt', 'shekels', 'cabbage', 'lettuce', 'bread', // "para" argoları
  'awful', 'terrible', // amazing'in arkaik "korkunç" anlamı
  'gay', 'queer', // eski anlamları modern kullanımda yanlış
]);

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const LIMIT = (() => {
  const a = args.find(x => x.startsWith('--limit='));
  return a ? parseInt(a.split('=')[1], 10) : Infinity;
})();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Datamuse'tan ham aday listesi (frekans metadata ile)
async function datamuse(rel, word) {
  const url = `https://api.datamuse.com/words?rel_${rel}=${encodeURIComponent(word)}&max=${FETCH_MAX}&md=f`;
  const arr = await fetchJSON(url);
  return arr.map(x => {
    const ftag = (x.tags || []).find(t => t.startsWith('f:'));
    const freq = ftag ? parseFloat(ftag.slice(2)) : 0;
    return { word: x.word, freq };
  });
}

// Kalite filtresi uygula.
// ÖNEMLI: Datamuse adayları zaten ALAKA sırasına göre döner (ilk = en güçlü eşleşme).
// Bu sırayı KORUYORUZ; frekansı yalnızca nadir/zayıf kelimeleri ELEMEK için kullanıyoruz.
// (Frekansa göre yeniden sıralamak amazing→awful gibi alakasız ama sık kelimeleri öne çıkarır.)
function filterResults(candidates, sourceWord) {
  const src = sourceWord.toLowerCase();
  return candidates
    .filter(c => c.word && !/[\s-]/.test(c.word))          // tek kelime
    .filter(c => c.freq >= MIN_FREQ)                        // yeterince yaygın (nadir kelimeleri ele)
    .filter(c => !BLACKLIST.has(c.word.toLowerCase()))      // bilinen yanlış-anlam/argo çöplerini ele
    .filter(c => {
      const w = c.word.toLowerCase();
      // kaynak kelimeyle aynı veya birbirini içeren kökleri ele (happy/happiness gibi)
      return w !== src && !w.includes(src) && !src.includes(w);
    })
    // alaka sırası korunur (sort YOK), sadece ilk MAX_RESULTS alınır
    .slice(0, MAX_RESULTS)
    .map(c => capitalize(c.word));
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')); } catch { return {}; }
  }
  return {};
}

function saveCache(cache) {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf-8');
}

async function main() {
  const cache = loadCache();

  // 1) İşlenecek tüm benzersiz kelimeleri topla (İngilizce, küçük harf)
  const data = {};
  const wordSet = new Set();
  for (const lvl of LEVELS) {
    data[lvl] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, lvl + '.json'), 'utf-8'));
    for (const w of data[lvl].words) wordSet.add(w.word.toLowerCase());
  }
  let words = [...wordSet];
  if (LIMIT < words.length) words = words.slice(0, LIMIT);
  console.log(`İşlenecek benzersiz kelime: ${words.length} (cache'te: ${Object.keys(cache).length})`);

  // 2) Eksik olanları API'den çek
  let fetched = 0, fromCache = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (cache[w]) { fromCache++; continue; }
    try {
      const synRaw = await datamuse('syn', w);
      await sleep(DELAY_MS);
      const antRaw = await datamuse('ant', w);
      await sleep(DELAY_MS);
      cache[w] = {
        synonyms: filterResults(synRaw, w),
        opposites: filterResults(antRaw, w),
      };
      fetched++;
      if (fetched % 100 === 0) {
        console.log(`  ${fetched} çekildi (${i + 1}/${words.length})... ara kayıt`);
        saveCache(cache);
      }
    } catch (e) {
      console.warn(`  UYARI: "${w}" çekilemedi (${e.message}), boş bırakıldı`);
      cache[w] = { synonyms: [], opposites: [] };
    }
  }
  saveCache(cache);
  console.log(`Çekme bitti: ${fetched} yeni, ${fromCache} cache'ten.`);

  // 3) JSON'lara uygula
  let withSyn = 0, withOpp = 0, totalApplied = 0;
  for (const lvl of LEVELS) {
    for (const w of data[lvl].words) {
      const key = w.word.toLowerCase();
      const c = cache[key] || { synonyms: [], opposites: [] };
      w.synonyms = c.synonyms;
      w.opposites = c.opposites;
      totalApplied++;
      if (c.synonyms.length) withSyn++;
      if (c.opposites.length) withOpp++;
    }
    if (!DRY) {
      fs.writeFileSync(path.join(DATA_DIR, lvl + '.json'), JSON.stringify(data[lvl], null, 2) + '\n', 'utf-8');
    }
  }

  console.log('\n=== KAPSAMA ===');
  console.log(`Toplam kelime: ${totalApplied}`);
  console.log(`Synonym dolu: ${withSyn} (%${Math.round(withSyn / totalApplied * 100)})`);
  console.log(`Opposite dolu: ${withOpp} (%${Math.round(withOpp / totalApplied * 100)})`);
  console.log(DRY ? '\n(--dry: JSON yazılmadı)' : '\n✓ JSON dosyaları güncellendi.');
}

main().catch(e => { console.error('HATA:', e); process.exit(1); });
