import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// @ts-ignore
import Swiper from 'react-native-deck-swiper';

const { width, height } = Dimensions.get('window');

import { useVocabularyStore, Word } from '../store/useVocabularyStore';
import { getChapterWords } from '../utils/wordHelper';

// Kartın kendi iç durumunu kontrol edebilmemiz için forwardRef kullanıyoruz
const CardItem = forwardRef(({ card }: { card: Word }, ref) => {
  const [flipped, setFlipped] = useState(false);
  
  // Dışarıdan Swiper aracılığıyla flip fonksiyonunu tetiklememize olanak tanır
  useImperativeHandle(ref, () => ({
    flip: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFlipped(prev => !prev);
    }
  }));

  // Kart verisi değiştiğinde (yeni deste geldiğinde) ön yüze dönmesini garantile
  useEffect(() => {
    setFlipped(false);
  }, [card.id]);

  return (
    <View style={styles.cardWrapper}>
      <View style={[styles.card, flipped ? styles.cardBack : styles.cardFront]}>
        {!flipped ? (
          <>
            <Text style={styles.wordTitle}>{card.word}</Text>
            <Text style={styles.label}>EXAMPLE SENTENCE</Text>
            <Text style={styles.sentenceText}>"{card.sentence}"</Text>
            <View style={styles.grammarTag}>
              <Text style={styles.grammarHeader}>TAP TO FLIP</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.translationText}>{card.translation}</Text>
            <Text style={styles.meaningText}>{card.meanings[0]}</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>SYNONYMS</Text>
              <Text style={styles.infoValue}>{card.synonyms?.length > 0 ? card.synonyms.join(', ') : 'None'}</Text>
              <View style={styles.line} />
              <Text style={styles.infoLabel}>OPPOSITES</Text>
              <Text style={styles.infoValue}>{card.opposites?.length > 0 ? card.opposites.join(', ') : 'None'}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
});

export default function FlashcardsScreen() {
  const router = useRouter();
  const { level, chapter } = useLocalSearchParams<{ level: string; chapter: string }>();
  
  const loadChapter = useVocabularyStore(state => state.loadChapter);
  const words = useVocabularyStore(state => state.words);
  const addFailedWord = useVocabularyStore(state => state.addFailedWord);
  const setCurrentBatch = useVocabularyStore(state => state.setCurrentBatch);
  const batchIndex = useVocabularyStore(state => state.batchIndex);
  const addLearnedWord = useVocabularyStore(state => state.addLearnedWord);
  const resetStreak = useVocabularyStore(state => state.resetStreak);
  const resetStreakIfNewDay = useVocabularyStore(state => state.resetStreakIfNewDay);
  const streak = useVocabularyStore(state => state.streak);

  const [deck, setDeck] = useState<Word[]>([]);
  const [deckKey, setDeckKey] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // RENDER-FREE TRACKING: Swiper çalışırken parent componenti re-render etmemek için Ref kullanıyoruz
  // Bu sayede kaydırma sırasında uygulamanın donmasını (freeze/black screen) tamamen engelliyoruz.
  const failedCardsRef = useRef<Word[]>([]);
  const learnedCardsRef = useRef<Word[]>([]);
  const targetBatchSizeRef = useRef<number>(0);

  const swiperRef = useRef<any>(null);
  const cardRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    if (level === 'A1' && chapter) {
      // Yeni gün kontrol et ve streak gerekirse sıfırla
      resetStreakIfNewDay();
      
      const chapterNumber = Number(chapter);
      const chapterWords = getChapterWords(level as string, chapterNumber);
      
      if (chapterWords && chapterWords.length > 0 && !isLoaded) {
        loadChapter(level as string, chapterNumber, { words: chapterWords });
        setIsLoaded(true);
      }
    }
  }, [level, chapter, isLoaded, loadChapter, resetStreakIfNewDay]);

  useEffect(() => {
    if (isLoaded && words.length > 0) {
      const startIdx = batchIndex * 5;
      const batchWords = words.slice(startIdx, startIdx + 5);
      
      if (batchWords.length > 0) {
        targetBatchSizeRef.current = batchWords.length;
        failedCardsRef.current = [];
        learnedCardsRef.current = [];
        cardRefs.current = {};
        setDeck([...batchWords]);
        setDeckKey(prev => prev + 1);
      }
    }
  }, [isLoaded, words, batchIndex]);

  const handleSwipeLeft = (cardIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetStreak();
    const card = deck[cardIndex];
    if (card) {
      addFailedWord(card.id);
      if (!failedCardsRef.current.find(c => c.id === card.id)) {
        failedCardsRef.current.push(card);
      }
    }
  };

  const handleSwipeRight = (cardIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const card = deck[cardIndex];
    if (card) {
      addLearnedWord();
      if (!learnedCardsRef.current.find(c => c.id === card.id)) {
        learnedCardsRef.current.push(card);
      }
    }
  };

  const handleSwipedAll = () => {
    if (failedCardsRef.current.length > 0) {
      // Sadece bilemediği (sola kaydırdığı) kartlardan yeni bir deste oluştur
      const remaining = [...failedCardsRef.current];
      failedCardsRef.current = []; // Sonraki tur için sıfırla
      learnedCardsRef.current = []; // Yeni tur için sıfırla
      cardRefs.current = {}; // Ref'leri sıfırla - yeni kartlar gelecek
      setDeck(remaining);
      setDeckKey(prev => prev + 1);
    } else {
      // Başarısız kartlar yoksa, tüm kartlar başarıyla öğrenildi demek
      // Eşleştirme oyununa geç
      setCurrentBatch(learnedCardsRef.current);
      setTimeout(() => {
        router.push({
          pathname: '/matching',
          params: { level, chapter }
        } as any);
      }, 300);
    }
  };

  // Swiper'ın kendi tıklama yakalayıcısını kullanıp, referans ile içeriye komut gönderiyoruz
  const handleTapCard = (cardIndex: number) => {
    const card = deck[cardIndex];
    if (card && cardRefs.current[card.id]) {
      cardRefs.current[card.id].flip();
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <MaterialCommunityIcons name="close" size={30} color="#FFF" />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>{level} - Chapter {chapter}</Text>
      </View>
      <View style={styles.streakBox}>
        <MaterialCommunityIcons name="fire" size={22} color="#FFD700" />
        <Text style={styles.streakText}>{streak}</Text>
      </View>
    </View>
  );

  if (deck.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Cards...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <Swiper
        ref={swiperRef}
        key={`swiper-deck-${deckKey}`}
        cards={deck}
        containerStyle={styles.swiperContainer}
        renderCard={(card: Word) => {
          if (!card) return <View />;
          return (
            <CardItem 
              key={`card-${card.id}`} 
              card={card} 
              ref={(el) => {
                if (el) cardRefs.current[card.id] = el;
              }} 
            />
          );
        }}
        onSwipedLeft={handleSwipeLeft}
        onSwipedRight={handleSwipeRight}
        // Aşağı kaydırmayı hata (sola) olarak say
        onSwipedBottom={handleSwipeLeft}
        // Yukarı kaydırmayı doğru (sağa) olarak say
        onSwipedTop={handleSwipeRight}
        onTapCard={handleTapCard}
        onSwipedAll={handleSwipedAll}
        overlayLabels={{
          left: {
            title: 'AGAIN',
            style: { label: styles.overlayLeft, wrapper: styles.overlayWrapperLeft }
          },
          right: {
            title: 'I KNOW',
            style: { label: styles.overlayRight, wrapper: styles.overlayWrapperRight }
          },
          bottom: {
            title: 'AGAIN',
            style: { label: styles.overlayBottom, wrapper: styles.overlayWrapperBottom }
          },
          top: {
            title: 'I KNOW',
            style: { label: styles.overlayTop, wrapper: styles.overlayWrapperTop }
          }
        }}
        backgroundColor={'#000'}
        stackSize={3}
        cardVerticalMargin={25}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 10 },
  swiperContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 130 : 120,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 25, 
    paddingTop: Platform.OS === 'ios' ? 60 : 50, 
    paddingBottom: 18,
    alignItems: 'center',
    zIndex: 10,
    minHeight: 110,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  headerInfo: { alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  streakBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  streakText: { color: '#FFD700', fontWeight: 'bold', marginLeft: 6 },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFD700', fontSize: 20 },
  
  cardWrapper: { height: height * 0.68, justifyContent: 'center', alignItems: 'center' },
  card: { width: width * 0.9, height: height * 0.62, borderRadius: 45, padding: 35, justifyContent: 'center' },
  cardFront: { backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#222' },
  cardBack: { backgroundColor: '#030303', borderWidth: 2, borderColor: '#FFD700' },
  
  wordTitle: { fontSize: 45, color: '#FFF', fontWeight: 'bold', textAlign: 'center' },
  label: { color: '#444', fontSize: 11, marginTop: 40, fontWeight: 'bold' },
  sentenceText: { color: '#DDD', fontSize: 21, fontStyle: 'italic', marginTop: 10 },
  grammarTag: { marginTop: 40, backgroundColor: '#151515', padding: 18, borderRadius: 15, alignItems: 'center' },
  grammarHeader: { color: '#FFD700', fontSize: 13, fontWeight: 'bold' },
  
  translationText: { fontSize: 40, color: '#FFD700', fontWeight: 'bold', fontStyle: 'italic', textAlign: 'center', marginBottom: 20 },
  meaningText: { color: '#CCC', fontSize: 15, marginBottom: 5, textAlign: 'center' },
  
  infoBox: { marginTop: 20, backgroundColor: '#111', padding: 20, borderRadius: 25 },
  infoLabel: { color: '#555', fontSize: 11, fontWeight: 'bold' },
  infoValue: { color: '#FFF', fontSize: 17, marginBottom: 5 },
  line: { height: 1, backgroundColor: '#222', marginVertical: 10 },
  
  overlayWrapperLeft: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', marginTop: 30, marginRight: 30 },
  overlayWrapperRight: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 30, marginLeft: 30 },
  overlayWrapperBottom: { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', marginTop: 30 },
  overlayWrapperTop: { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 30 },
  overlayLeft: { backgroundColor: '#F44336', color: 'white', fontSize: 24, fontWeight: 'bold', padding: 10, borderRadius: 10 },
  overlayRight: { backgroundColor: '#4CAF50', color: 'white', fontSize: 24, fontWeight: 'bold', padding: 10, borderRadius: 10 },
  overlayBottom: { backgroundColor: '#F44336', color: 'white', fontSize: 24, fontWeight: 'bold', padding: 10, borderRadius: 10 },
  overlayTop: { backgroundColor: '#4CAF50', color: 'white', fontSize: 24, fontWeight: 'bold', padding: 10, borderRadius: 10 }
});