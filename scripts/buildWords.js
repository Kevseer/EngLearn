/*
 * buildWords.js — Oxford kelime listesi PDF'lerinden uygulama JSON'larını üretir.
 *
 * Kaynak: assets/data/seviye_kelimeleri/*.pdf  (pdftotext -layout -enc UTF-8 ile çıkarılmış .txt)
 * Hedef:  assets/data/A1.json ... C1.json  (her biri tam 900 kelime = 60 chapter x 15)
 *
 * Kurallar:
 *  - Bir kelime yalnızca TEK seviyede ve TEK kez bulunur (global dedup).
 *  - Her seviye tam 900 kelimeye eşitlenir (fazlası kırpılır, eksiği havuzdan tamamlanır).
 *  - Her kelimeye otomatik şablon örnek cümle eklenir; synonyms/opposites boş bırakılır.
 *
 * Çalıştırma:
 *   1) PDF'leri metne çevir:
 *      pdftotext -layout -enc UTF-8 "<pdf>" .tmp_pdf/<LVL>.txt
 *   2) node scripts/buildWords.js
 */

const fs = require('fs');
const path = require('path');
const MANUAL = require('./manualWords');

const ROOT = path.resolve(__dirname, '..');
const TXT_DIR = path.join(ROOT, '.tmp_pdf');
const OUT_DIR = path.join(ROOT, 'assets', 'data');

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const CHAPTER_SIZE = 15;
const TARGET_CHAPTERS = 60;
const TARGET_WORDS = CHAPTER_SIZE * TARGET_CHAPTERS; // 900

// PDF metnindeki gürültü (başlık/sayfa numarası vb.)
const NOISE = /Terms|Sayfa|OXFORD|^\s*Meanings/i;

// Bir anlam bloğundaki kalıntı "Meanings2/Meanings3" başlığını temizle
function cleanMeaning(s) {
  return s.replace(/Meanings\d?/g, '').replace(/\s+/g, ' ').trim();
}

// Bir satırı { term, meanings[] } olarak ayrıştır
function parseLine(line) {
  if (!line.trim() || NOISE.test(line)) return null;
  if (!/^[A-Za-z]/.test(line)) return null; // satır harfle başlamıyorsa wrap/gürültü

  const termMatch = line.match(/^(\S+)/);
  if (!termMatch) return null;
  const term = termMatch[1].trim();
  const rest = line.slice(term.length);

  // Her anlam: "...metin... [tür.]" bloğu
  const rawMeanings = rest.match(/\s*([^\[]+\[[^\]]+\])/g) || [];
  const meanings = rawMeanings
    .map(cleanMeaning)
    .filter(m => m.length > 0 && /\[[^\]]+\]/.test(m)); // tür etiketi olanları tut

  if (meanings.length === 0) return null;
  return { term, meanings };
}

// Bir seviyenin tüm ham kelimelerini sırayla çıkar (term -> meanings)
function extractLevel(lvl) {
  const file = path.join(TXT_DIR, lvl + '.txt');
  if (!fs.existsSync(file)) {
    console.warn('UYARI: bulunamadı', file);
    return [];
  }
  const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);
  const out = [];
  const seenInLevel = new Set();
  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    const key = parsed.term.toLowerCase();
    if (seenInLevel.has(key)) continue; // seviye içi tekrarı at
    seenInLevel.add(key);
    out.push(parsed);
  }
  return out;
}

// Türkçe anlamdan tür etiketini at: "yaklaşık [zf.]" -> "yaklaşık"
function stripTag(meaning) {
  return meaning.replace(/\s*\[[^\]]+\]\s*$/, '').trim();
}

// Otomatik şablon örnek cümle (kelime türüne göre basit)
function buildSentence(word) {
  const w = word.toLowerCase();
  return `This is an example with the word "${w}".`;
}

function toWordObject(entry, level, chapter, indexInChapter) {
  const id = `${level}-${chapter}-${indexInChapter}`;
  // İlk anlam ana çeviri; üç anlamı da meanings olarak tut (tagsız, benzersiz)
  const cleanTr = entry.meanings.map(stripTag).filter(Boolean);
  const uniqTr = Array.from(new Set(cleanTr));
  const translation = uniqTr[0] || entry.term;
  return {
    id,
    word: capitalize(entry.term),
    translation: capitalize(translation),
    meanings: uniqTr.length ? uniqTr.map(capitalize) : [capitalize(entry.term)],
    sentence: buildSentence(entry.term),
    synonyms: [],
    opposites: [],
  };
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function main() {
  // 1) Tüm seviyeleri çıkar
  const rawByLevel = {};
  for (const lvl of LEVELS) {
    rawByLevel[lvl] = extractLevel(lvl);
    console.log(`${lvl}: ham benzersiz kelime = ${rawByLevel[lvl].length}`);
  }

  // 2) Global dedup: bir kelime sadece ilk göründüğü seviyede kalır (A1 > A2 > B1 > B2 > C1)
  const usedGlobal = new Set();
  const dedupByLevel = {};
  for (const lvl of LEVELS) {
    dedupByLevel[lvl] = [];
    for (const e of rawByLevel[lvl]) {
      const key = e.term.toLowerCase();
      if (usedGlobal.has(key)) continue;
      usedGlobal.add(key);
      dedupByLevel[lvl].push(e);
    }
    console.log(`${lvl}: global dedup sonrası = ${dedupByLevel[lvl].length}`);
  }

  // 3) Fazla kelimeleri (900 üstü) at — havuz/karışım YOK, her seviye kendi kelimeleriyle kalır
  for (const lvl of LEVELS) {
    if (dedupByLevel[lvl].length > TARGET_WORDS) {
      dedupByLevel[lvl] = dedupByLevel[lvl].slice(0, TARGET_WORDS);
    }
  }

  // 4) Eksik seviyeleri manualWords.js'teki elle eklenmiş, doğrulanmış kelimelerle tamamla.
  //    Çakışma kuralı kod ile zorlanır: manuel kelime hiçbir PDF seviyesinde olamaz.
  for (const lvl of LEVELS) {
    const need = TARGET_WORDS - dedupByLevel[lvl].length;
    if (need <= 0) continue;

    const manual = MANUAL[lvl] || [];
    let added = 0;
    for (const m of manual) {
      const key = m.word.toLowerCase();
      if (usedGlobal.has(key)) {
        throw new Error(`HATA: manuel kelime "${m.word}" (${lvl}) zaten başka bir yerde kullanılıyor!`);
      }
      usedGlobal.add(key);
      // manuel kelimeyi parser'ın ürettiği biçime çevir: { term, meanings[] }
      dedupByLevel[lvl].push({
        term: m.word,
        meanings: m.meanings.map(t => `${t} [m.]`), // tag uyumu için (stripTag bunu temizler)
        manual: true,
      });
      added++;
      if (dedupByLevel[lvl].length >= TARGET_WORDS) break;
    }

    const still = TARGET_WORDS - dedupByLevel[lvl].length;
    if (still > 0) {
      console.warn(`UYARI: ${lvl} hâlâ ${still} kelime eksik (manualWords.js'e ${still} kelime daha ekleyin). Eklenen: ${added}`);
    } else {
      console.log(`${lvl}: ${added} manuel kelime eklendi -> 900 tamam`);
    }
  }

  // 5) JSON üret
  let report = [];
  for (const lvl of LEVELS) {
    const entries = dedupByLevel[lvl].slice(0, TARGET_WORDS);
    const words = entries.map((e, i) => {
      const chapter = Math.floor(i / CHAPTER_SIZE) + 1;
      const indexInChapter = (i % CHAPTER_SIZE) + 1;
      return toWordObject(e, lvl, chapter, indexInChapter);
    });
    const json = { level: lvl, words };
    fs.writeFileSync(path.join(OUT_DIR, lvl + '.json'), JSON.stringify(json, null, 2) + '\n', 'utf-8');
    report.push(`${lvl}: ${words.length} kelime, ${Math.ceil(words.length / CHAPTER_SIZE)} chapter`);
  }

  console.log('\n=== SONUÇ ===');
  report.forEach(r => console.log(r));

  // 6) Global benzersizlik doğrulaması
  const allWords = [];
  for (const lvl of LEVELS) {
    const j = JSON.parse(fs.readFileSync(path.join(OUT_DIR, lvl + '.json'), 'utf-8'));
    j.words.forEach(w => allWords.push(w.word.toLowerCase()));
  }
  const uniq = new Set(allWords);
  console.log(`\nToplam kelime = ${allWords.length}, benzersiz = ${uniq.size}`);
  if (allWords.length !== uniq.size) {
    console.warn('UYARI: tekrar eden kelime var!');
  } else {
    console.log('✓ Tüm kelimeler global olarak benzersiz.');
  }
}

main();
