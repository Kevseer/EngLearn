# Kelime Kartları — Mobil Uygulama

Bu depo, Expo ve React Native ile geliştirilmiş hafif bir mobil uygulama içermektedir. Uygulama, kelime öğrenimine odaklı bir flashcard deneyimi sunar: kaydırma etkileşimleri, günlük streak takibi ve eşleştirme mini oyunu.

## Öne Çıkan Özellikler

- Kart destesi tabanlı öğrenme ("Biliyorum" / "Tekrar").
- Kalıcı günlük streak takibi (Zustand + AsyncStorage ile).
- Başarılı paketleri takiben eşleştirme oyunu.
- Çevrimdışı çalışabilir; yerel JSON kelime listeleri kullanır.
- Minimal, okunabilir TypeScript + React Native kod tabanı.

## Teknolojiler

- Expo
- React Native
- TypeScript
- Zustand
- AsyncStorage

## Gereksinimler

- Node.js 16+ (veya uyumlu LTS)
- npm veya yarn
- Expo CLI (yerel cihaz/simülatör için önerilir)

Expo CLI yüklemek için:

```bash
npm install -g expo-cli
```

## Kurulum ve Çalıştırma

1. Bağımlılıkları yükleyin

```bash
npm install
# veya: yarn install
```

2. Geliştirme sunucusunu başlatın

```bash
npm run start
# veya: yarn start
```

3. Platformda çalıştırma

- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`

## Depo Yapısı

- `app/` — Ekranlar ve yönlendirme (Expo Router)
- `assets/` — Resimler ve yerel veriler (kelime listeleri)
- `components/` — Tekrar kullanılabilir bileşenler
- `store/` — Zustand store ve kalıcılık
- `utils/` — Yardımcı fonksiyonlar ve veri yükleyiciler
- `scripts/` — Yardımcı betikler (project reset)

## Ortam Değişkenleri ve Gizli Bilgiler

Varsayılan kurulumda sunucu tarafı API anahtarları gerekmez. Eğer gizli anahtar ekleyecekseniz, `.env` dosyaları kullanın ve bunların `.gitignore` içinde olduğundan emin olun. Depo zaten `.DS_Store` ve `node_modules` gibi dosyaları yok saymaktadır.

## Bakım Notları

- `react-native-deck-swiper` ile çalışırken, parent component'in gereksiz renderlarını engelleyin; aksi takdirde UI donmaları olabilir.
- Bir kart başarısız (sola kaydırma) olduğunda, o günkü streak sıfırlanır.

## Katkıda Bulunma

1. Depoyu fork'layın ve açıklayıcı bir branch oluşturun.
2. PR'ler küçük ve odaklı olsun.
3. `npm run lint` çalıştırın ve TypeScript kontrollerinin geçtiğinden emin olun.

## Lisans

İstiyorsanız lisans ekleyin (küçük projeler için MIT yaygındır).
