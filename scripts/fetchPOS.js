/*
 * fetchPOS.js — Her kelimenin baskın sözcük türünü (POS) Datamuse'tan çeker.
 *
 * Şablon cümle üretimi için gereklidir: isim/fiil/sıfat/zarf farklı cümle kalıbı alır.
 * Datamuse md=p ile POS metadata döner: n (isim), v (fiil), adj (sıfat), adv (zarf).
 * İlk etiket = en yaygın kullanım.
 *
 * Çıktı: .cache/pos.json — { kelime: "n"|"v"|"adj"|"adv"|"unknown" }
 * Çalıştırma: node scripts/fetchPOS.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'assets', 'data');
const CACHE_DIR = path.join(ROOT, '.cache');
const POS_FILE = path.join(CACHE_DIR, 'pos.json');

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const DELAY_MS = 55;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } }); }).on('error', reject);
  });
}

function loadCache() { try { return JSON.parse(fs.readFileSync(POS_FILE, 'utf-8')); } catch { return {}; } }
function saveCache(c) { if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true }); fs.writeFileSync(POS_FILE, JSON.stringify(c), 'utf-8'); }

// Datamuse POS etiketlerinden baskın türü seç (öncelik: n > v > adj > adv)
function dominantPOS(tags) {
  if (!tags) return 'unknown';
  const pos = tags.filter(t => ['n', 'v', 'adj', 'adv'].includes(t));
  if (pos.length === 0) return 'unknown';
  return pos[0]; // Datamuse en yaygın kullanımı önce verir
}

async function main() {
  const wordSet = new Set();
  for (const lvl of LEVELS) {
    const j = JSON.parse(fs.readFileSync(path.join(DATA_DIR, lvl + '.json'), 'utf-8'));
    for (const w of j.words) wordSet.add(w.word.toLowerCase());
  }
  const words = [...wordSet];
  const cache = loadCache();
  console.log(`POS çekilecek: ${words.length} kelime (cache: ${Object.keys(cache).length})`);

  let fetched = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (cache[w]) continue;
    try {
      const r = await fetchJSON(`https://api.datamuse.com/words?sp=${encodeURIComponent(w)}&md=p&max=1`);
      await sleep(DELAY_MS);
      cache[w] = (r[0] && r[0].word.toLowerCase() === w) ? dominantPOS(r[0].tags) : 'unknown';
      fetched++;
      if (fetched % 200 === 0) { console.log(`  ${fetched} çekildi (${i + 1}/${words.length})`); saveCache(cache); }
    } catch (e) {
      cache[w] = 'unknown';
    }
  }
  saveCache(cache);

  // Dağılım raporu
  const dist = {};
  for (const w of words) { const p = cache[w] || 'unknown'; dist[p] = (dist[p] || 0) + 1; }
  console.log('\n=== POS DAĞILIMI ===');
  for (const k of Object.keys(dist)) console.log(`  ${k}: ${dist[k]}`);
  console.log(`\n✓ ${POS_FILE}`);
}

main().catch(e => { console.error('HATA:', e); process.exit(1); });
