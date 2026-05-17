// @ts-ignore
import A1Data from '../assets/data/A1.json';

// Deterministic random number generator (Linear Congruential Generator)
// Bu fonksiyon her zaman aynı seed (çekirdek) değeri için aynı rastgele sayı dizisini üretir.
function seededRandom(seed: number) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Seçilen seviyenin kelimelerini her zaman aynı şekilde karıştırılmış (shuffled) olarak döndürür
export function getLevelWords(level: string) {
  if (level !== 'A1') return [];
  
  // Benzersiz kelimeleri filtrele (aynı kelime tekrar etmesin)
  const uniqueWordsMap = new Map();
  A1Data.words.forEach((item: any) => {
    const wordKey = item.word.toLowerCase();
    if (!uniqueWordsMap.has(wordKey)) {
      uniqueWordsMap.set(wordKey, item);
    }
  });
  
  const words = Array.from(uniqueWordsMap.values());

  // Seed değerini sabit tutuyoruz (örn: 12345). Böylece kelimeler rastgele dağıtılır
  // AMA bu dağılım herkesin telefonunda BİREBİR aynı olur.
  const random = seededRandom(12345); 
  
  // Fisher-Yates karıştırma algoritması
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  
  return words;
}

// Seviyeye ait dinamik bölüm sayısını hesaplar
export function getChapters(level: string) {
  const words = getLevelWords(level);
  const numChapters = Math.ceil(words.length / 15);
  return Array.from({ length: numChapters }, (_, i) => i + 1);
}

// İstenilen bölümün 15 kelimesini döndürür
export function getChapterWords(level: string, chapter: number) {
  const words = getLevelWords(level);
  const startIndex = (chapter - 1) * 15;
  return words.slice(startIndex, startIndex + 15);
}
