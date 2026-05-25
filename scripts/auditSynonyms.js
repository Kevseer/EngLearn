/*
 * auditSynonyms.js — Mevcut synonym/opposite verisini denetler.
 *
 * Yöntem: Çift yönlülük (bidirectional) doğrulaması.
 *   - Gerçek synonym karşılıklıdır: A→B ise, Datamuse'da B→A da olmalı.
 *   - Tek yönlü eşleşmeler (A→B ama B↛A) ŞÜPHELİ olarak işaretlenir.
 *   - Opposite için aynı mantık (antonym de karşılıklıdır).
 *
 * Datamuse'a benzersiz kelime başına 2 istek (syn + ant) atar, cache'ler.
 * Çıktı: .cache/audit_report.json — şüpheli eşleşmeler + gerekçe.
 *
 * Çalıştırma: node scripts/auditSynonyms.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'assets', 'data');
const CACHE_DIR = path.join(ROOT, '.cache');
const REL_CACHE = path.join(CACHE_DIR, 'audit_relations.json'); // kelime -> {syn:[], ant:[]} (ham, geniş)
const REPORT = path.join(CACHE_DIR, 'audit_report.json');

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const DELAY_MS = 55;
const FETCH_MAX = 50; // çift yönlülük için geniş liste çek

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } }); }).on('error', reject);
  });
}

function loadCache() { try { return JSON.parse(fs.readFileSync(REL_CACHE, 'utf-8')); } catch { return {}; } }
function saveCache(c) { if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true }); fs.writeFileSync(REL_CACHE, JSON.stringify(c), 'utf-8'); }

// Bir kelimenin Datamuse'daki tüm syn ve ant ilişkilerini (geniş, ham) getir + cache
async function relations(word, cache) {
  const key = word.toLowerCase();
  if (cache[key]) return cache[key];
  const syn = await fetchJSON(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(key)}&max=${FETCH_MAX}`);
  await sleep(DELAY_MS);
  const ant = await fetchJSON(`https://api.datamuse.com/words?rel_ant=${encodeURIComponent(key)}&max=${FETCH_MAX}`);
  await sleep(DELAY_MS);
  cache[key] = {
    syn: syn.map(x => x.word.toLowerCase()),
    ant: ant.map(x => x.word.toLowerCase()),
  };
  return cache[key];
}

async function main() {
  // 1) Mevcut tüm eşleşmeleri topla
  const pairs = [];
  const needWords = new Set();
  for (const lvl of LEVELS) {
    const j = JSON.parse(fs.readFileSync(path.join(DATA_DIR, lvl + '.json'), 'utf-8'));
    for (const w of j.words) {
      const word = w.word.toLowerCase();
      (w.synonyms || []).forEach(s => { pairs.push({ word, type: 'syn', value: s.toLowerCase() }); needWords.add(word); needWords.add(s.toLowerCase()); });
      (w.opposites || []).forEach(o => { pairs.push({ word, type: 'opp', value: o.toLowerCase() }); needWords.add(word); needWords.add(o.toLowerCase()); });
    }
  }
  console.log(`Denetlenecek eşleşme: ${pairs.length}, benzersiz kelime: ${needWords.size}`);

  // 2) Tüm gerekli kelimelerin ilişkilerini çek (cache'li)
  const cache = loadCache();
  const words = [...needWords];
  let fetched = 0;
  for (let i = 0; i < words.length; i++) {
    if (cache[words[i]]) continue;
    try { await relations(words[i], cache); fetched++; }
    catch (e) { cache[words[i]] = { syn: [], ant: [] }; }
    if (fetched > 0 && fetched % 150 === 0) { console.log(`  ${fetched} kelime ilişkisi çekildi (${i + 1}/${words.length})`); saveCache(cache); }
  }
  saveCache(cache);
  console.log(`İlişki çekme bitti (${fetched} yeni).`);

  // 3) Çift yönlülük denetimi
  // syn A→B şüpheli ise: B'nin syn listesinde A YOK (ve A'nın da B ile başka türlü ilişkisi zayıf)
  // opp A→B şüpheli ise: B'nin ant listesinde A YOK
  const suspects = [];
  for (const p of pairs) {
    const rev = cache[p.value] || { syn: [], ant: [] };
    if (p.type === 'syn') {
      const reciprocal = rev.syn.includes(p.word);
      if (!reciprocal) suspects.push({ ...p, reason: 'tek-yönlü-synonym (B→A yok)' });
    } else {
      const reciprocal = rev.ant.includes(p.word);
      if (!reciprocal) suspects.push({ ...p, reason: 'tek-yönlü-opposite (B↛A)' });
    }
  }

  fs.writeFileSync(REPORT, JSON.stringify(suspects, null, 2), 'utf-8');
  console.log('\n=== DENETİM RAPORU ===');
  console.log(`Toplam eşleşme: ${pairs.length}`);
  console.log(`Şüpheli (tek yönlü): ${suspects.length} (%${Math.round(suspects.length / pairs.length * 100)})`);
  console.log(`  - synonym şüpheli: ${suspects.filter(s => s.type === 'syn').length}`);
  console.log(`  - opposite şüpheli: ${suspects.filter(s => s.type === 'opp').length}`);
  console.log(`\nRapor: ${REPORT}`);
}

main().catch(e => { console.error('HATA:', e); process.exit(1); });
