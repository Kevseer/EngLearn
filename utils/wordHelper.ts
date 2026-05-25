// @ts-ignore
import A1Data from '../assets/data/A1.json';
// @ts-ignore
import A2Data from '../assets/data/A2.json';
// @ts-ignore
import B1Data from '../assets/data/B1.json';
// @ts-ignore
import B2Data from '../assets/data/B2.json';
// @ts-ignore
import C1Data from '../assets/data/C1.json';

// Bir bölüm (chapter) 15 kelime içerir ve 3 mini-tura (her biri 5 kelime) bölünür.
export const CHAPTER_SIZE = 15;
export const GROUP_SIZE = 5;
export const GROUPS_PER_CHAPTER = CHAPTER_SIZE / GROUP_SIZE; // = 3

const levelDataMap: Record<string, any> = {
  'A1': A1Data,
  'A2': A2Data,
  'B1': B1Data,
  'B2': B2Data,
  'C1': C1Data,
};

// Seçilen seviyenin kelimelerini Oxford A1 listesi sırasına göre döndürür.
// Böylece Chapter 1, veri dosyasındaki ilk 5 kelimeyi içerir; diğer bölümler
// bu kelimelerle çakışmayan ardışık bloklardan oluşur.
export function getLevelWords(level: string) {
  const data = levelDataMap[level];
  if (!data || !data.words) return [];
  
  const uniqueWordsMap = new Map<string, any>();
  data.words.forEach((item: any) => {
    const wordKey = item.word.toLowerCase();
    if (!uniqueWordsMap.has(wordKey)) {
      uniqueWordsMap.set(wordKey, item);
    }
  });
  
  return Array.from(uniqueWordsMap.values());
}

// Seviyeye ait dinamik bölüm sayısını hesaplar
export function getChapters(level: string) {
  const words = getLevelWords(level);
  const numChapters = Math.ceil(words.length / CHAPTER_SIZE);
  return Array.from({ length: numChapters }, (_, i) => i + 1);
}

// İstenilen bölümün CHAPTER_SIZE (15) kelimesini döndürür
export function getChapterWords(level: string, chapter: number) {
  const words = getLevelWords(level);
  const startIndex = (chapter - 1) * CHAPTER_SIZE;
  return words.slice(startIndex, startIndex + CHAPTER_SIZE);
}

// Bölümün 15 kelimesini 3 mini-tura (her biri 5 kelime) böler.
// Son bölüm 15'ten az kelime içeriyorsa, daha küçük gruplar dönebilir.
export function getChapterGroups(level: string, chapter: number) {
  const words = getChapterWords(level, chapter);
  const groups: any[][] = [];
  for (let i = 0; i < words.length; i += GROUP_SIZE) {
    groups.push(words.slice(i, i + GROUP_SIZE));
  }
  return groups;
}

// Belirli bir grubun (mini-tur) kelimelerini döndürür (groupIndex: 0, 1, 2)
export function getGroupWords(level: string, chapter: number, groupIndex: number) {
  const words = getChapterWords(level, chapter);
  const startIndex = groupIndex * GROUP_SIZE;
  return words.slice(startIndex, startIndex + GROUP_SIZE);
}

// İstenilen bölüm için okuma parçası (Reading) döndürür.
// Reading'ler build-time'da scripts/buildReadings.js ile üretilip JSON'a (readings[])
// gömülür: tema çerçeveli, o chapter'ın 15 kelimesini bağlamda gösteren mini hikaye.
// Bu fonksiyon yalnızca gömülü veriyi okur (runtime hesaplama yok).
export function getChapterReading(level: string, chapter: number) {
  const data = levelDataMap[level];
  const readings = data && data.readings;
  const r = readings && readings[chapter - 1];

  if (r && r.text) {
    return {
      title: r.title || `${level} Chapter ${chapter} - Reading Practice`,
      text: r.text,
      translation: r.translation || '',
    };
  }

  // Geriye dönük güvenlik: gömülü reading yoksa kelimeleri basitçe listele
  const words = getChapterWords(level, chapter);
  if (!words || words.length === 0) {
    return {
      title: `${level} Chapter ${chapter}`,
      text: 'No reading available for this chapter.',
      translation: 'Bu bölüm için okuma parçası yok.',
    };
  }
  return {
    title: `${level} Chapter ${chapter} - Reading Practice`,
    text: words.map((w: any) => w.sentence).join(' '),
    translation: words.map((w: any) => `${w.word} = ${w.translation}`).join(' · '),
  };
}
