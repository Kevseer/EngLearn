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
// @ts-ignore
import C2Data from '../assets/data/C2.json';

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
  'C2': C2Data,
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

// İstenilen bölüm için okuma parçası (Reading) döndürür
export function getChapterReading(level: string, chapter: number) {
  // Uygulama çevrimdışı çalıştığı için yapay zeka ile anlık hikaye üretilemiyor.
  // Bu yüzden rastgele kelimeleri boşluklara doldurmak yerine, 
  // tamamen mantıklı ve A1 seviyesine uygun 3 farklı sabit hikaye döngüye sokulur.
  const templates = [
    {
      genre: "Daily Life",
      title: "A Day with Friends",
      text: "Today is Sunday. It is my favorite day of the week. I wake up early in the morning. I eat a big breakfast with my family. We eat eggs, cheese, and bread. Then, I go out. I meet my friends at the park. The weather is very nice. The sun is shining. We sit on the grass and talk. We talk about school and games. We sit for a long time. Then, my friend says, 'Let's go home. I am hungry.' We say goodbye. I walk back home. I listen to music on my way. I arrive home. I rest in my room. I love Sundays.",
      translation: "Bugün Pazar. Haftanın en sevdiğim günü. Sabah erken uyanırım. Ailemle büyük bir kahvaltı yaparım. Yumurta, peynir ve ekmek yeriz. Sonra dışarı çıkarım. Parkta arkadaşlarımla buluşurum. Hava çok güzel. Güneş parlıyor. Çimlere oturur ve konuşuruz. Okul ve oyunlar hakkında konuşuruz. Uzun süre otururuz. Sonra arkadaşım, 'Hadi eve gidelim. Açım.' der. Vedalaşırız. Eve geri yürürüm. Yolda müzik dinlerim. Eve varırım. Odamda dinlenirim. Pazarları seviyorum."
    },
    {
      genre: "Travel",
      title: "A Short Trip",
      text: "My family and I go on a trip today. We go to a small town. The town is near the sea. We drive our car. The journey is two hours long. I look out the window. I see big trees and small houses. We arrive in the town at noon. We are very hungry. We find a small restaurant. We eat fish and salad. The food is delicious. After lunch, we walk on the beach. The water is blue and clean. I find some beautiful shells. We take a lot of photos. In the evening, we get back in the car. We go home. I am tired but very happy.",
      translation: "Ailem ve ben bugün bir geziye çıkıyoruz. Küçük bir kasabaya gidiyoruz. Kasaba denizin yanında. Arabamızı sürüyoruz. Yolculuk iki saat sürüyor. Pencereden dışarı bakıyorum. Büyük ağaçlar ve küçük evler görüyorum. Kasabaya öğlen varıyoruz. Çok açız. Küçük bir restoran buluyoruz. Balık ve salata yiyoruz. Yemek lezzetli. Öğle yemeğinden sonra plajda yürüyoruz. Su mavi ve temiz. Bazı güzel deniz kabukları buluyorum. Çok fazla fotoğraf çekiyoruz. Akşam arabaya geri biniyoruz. Eve gidiyoruz. Yorgunum ama çok mutluyum."
    },
    {
      genre: "Hobby",
      title: "My New Cat",
      text: "I have a new pet. It is a small cat. Her name is Luna. She is white and very soft. Luna sleeps a lot. She likes to sleep on my bed. In the afternoon, she wakes up. She wants to play. I have a small red ball. I throw the ball. Luna runs fast and catches it. She is very funny. Sometimes, she sits by the window. She watches the birds outside. She makes small sounds. At night, I give her food and water. She eats quickly. Then, she comes to me. She sits on my lap. I read a book, and she sleeps. She is a very good friend.",
      translation: "Yeni bir evcil hayvanım var. O küçük bir kedi. Onun adı Luna. O beyaz ve çok yumuşak. Luna çok uyur. Benim yatağımda uyumayı sever. Öğleden sonra uyanır. Oynamak ister. Küçük kırmızı bir topum var. Topu atarım. Luna hızlıca koşar ve onu yakalar. O çok komiktir. Bazen pencerenin kenarında oturur. Dışarıdaki kuşları izler. Küçük sesler çıkarır. Gece ona yemek ve su veririm. Hızlıca yer. Sonra bana gelir. Kucağıma oturur. Ben kitap okurum, o ise uyur. O çok iyi bir arkadaştır."
    }
  ];

  // Bölüm sayısına göre tür seçimi yap (0, 1, 2 döngüsü)
  const templateIndex = (chapter - 1) % 3;
  const selectedTemplate = templates[templateIndex];

  return {
    title: `${level} Chapter ${chapter} - ${selectedTemplate.title}`,
    text: selectedTemplate.text,
    translation: selectedTemplate.translation
  };
}
