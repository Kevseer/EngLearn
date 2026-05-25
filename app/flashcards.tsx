import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// @ts-ignore
import Swiper from 'react-native-deck-swiper';

const { width, height } = Dimensions.get('window');

import { useVocabularyStore, Word } from '../store/useVocabularyStore';
import { GROUP_SIZE, getChapterReading, getChapterWords } from '../utils/wordHelper';

// Kartın kendi iç durumunu kontrol edebilmemiz için forwardRef kullanıyoruz
const CardItem = forwardRef(({ card, onRendered, isTopCard }: { card: Word; onRendered?: () => void; isTopCard?: boolean }, ref) => {
  const [flipped, setFlipped] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);

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
    setHasRendered(false);
  }, [card.id]);

  const handleLayout = () => {
    if (isTopCard && !hasRendered) {
      setHasRendered(true);
      onRendered?.();
    }
  };

  return (
    <View style={styles.cardWrapper} onLayout={handleLayout}>
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
            {/* Synonym/opposite yalnızca veri varsa gösterilir; boşsa bölüm gizlenir */}
            {(card.synonyms?.length > 0 || card.opposites?.length > 0) && (
              <View style={styles.infoBox}>
                {card.synonyms?.length > 0 && (
                  <>
                    <Text style={styles.infoLabel}>SYNONYMS</Text>
                    <Text style={styles.infoValue}>{card.synonyms.join(', ')}</Text>
                  </>
                )}
                {card.synonyms?.length > 0 && card.opposites?.length > 0 && (
                  <View style={styles.line} />
                )}
                {card.opposites?.length > 0 && (
                  <>
                    <Text style={styles.infoLabel}>OPPOSITES</Text>
                    <Text style={styles.infoValue}>{card.opposites.join(', ')}</Text>
                  </>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
});

const FlashcardHeader = ({ level, chapter, groupIndex }: { level: string; chapter: string; groupIndex: number }) => {
  const router = useRouter();
  const streak = useVocabularyStore(state => state.streak);

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <MaterialCommunityIcons name="close" size={30} color="#FFF" />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>{level} - Chapter {chapter}</Text>
        <Text style={styles.headerSubtitle}>Set {groupIndex + 1} / 3</Text>
      </View>
      <View style={styles.streakBox}>
        <MaterialCommunityIcons name="fire" size={22} color="#FFD700" />
        <Text style={styles.streakText}>{streak}</Text>
      </View>
    </View>
  );
};

export default function FlashcardsScreen() {
  const router = useRouter();
  const { level, chapter } = useLocalSearchParams<{ level: string; chapter: string }>();

  const loadChapter = useVocabularyStore(state => state.loadChapter);
  const words = useVocabularyStore(state => state.words);
  const addFailedWord = useVocabularyStore(state => state.addFailedWord);
  const recordStepResult = useVocabularyStore(state => state.recordStepResult);
  const setCurrentBatch = useVocabularyStore(state => state.setCurrentBatch);
  const groupIndex = useVocabularyStore(state => state.groupIndex);
  const addLearnedWord = useVocabularyStore(state => state.addLearnedWord);
  const resetStreak = useVocabularyStore(state => state.resetStreak);
  const resetStreakIfNewDay = useVocabularyStore(state => state.resetStreakIfNewDay);
  const hasSeenSwipeTutorial = useVocabularyStore(state => state.hasSeenSwipeTutorial);
  const setSwipeTutorialSeen = useVocabularyStore(state => state.setSwipeTutorialSeen);

  const [deck, setDeck] = useState<Word[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [shouldResetIndex, setShouldResetIndex] = useState(false);

  // Swipe UX: tek seferlik öğretici + ilk swipe'a kadar ipucu
  const [showTutorial, setShowTutorial] = useState(!hasSeenSwipeTutorial);
  const [showHint, setShowHint] = useState(true);
  const tutorialAnim = useRef(new Animated.Value(0)).current; // -1..1 sağa-sola sallanma

  // RENDER-FREE TRACKING: Swiper çalışırken parent componenti re-render etmemek için Ref kullanıyoruz.
  // Bu sayede kaydırma sırasında uygulamanın donmasını (freeze/black screen) engelliyoruz.
  const failedCardsRef = useRef<Word[]>([]);
  const learnedCardsRef = useRef<Word[]>([]);

  const swiperRef = useRef<any>(null);
  const cardRefs = useRef<Record<string, any>>({});
  const isNavigating = useRef(false);

  // Bölüm verisini yükle (tüm seviyeler için çalışır)
  useEffect(() => {
    if (level && chapter) {
      // Yeni gün kontrol et ve streak gerekirse sıfırla
      resetStreakIfNewDay();

      const chapterNumber = Number(chapter);
      const chapterWords = getChapterWords(level as string, chapterNumber);
      const chapterReading = getChapterReading(level as string, chapterNumber);

      if (chapterWords && chapterWords.length > 0 && !isLoaded) {
        loadChapter(level as string, chapterNumber, { words: chapterWords, reading: chapterReading });
        setIsLoaded(true);
      }
    }
  }, [level, chapter, isLoaded, loadChapter, resetStreakIfNewDay]);

  // groupIndex değiştikçe o turun 5 kelimesini desteye yükle
  useEffect(() => {
    if (isLoaded && words.length > 0) {
      const startIdx = groupIndex * GROUP_SIZE;
      const groupWords = words.slice(startIdx, startIdx + GROUP_SIZE);

      if (groupWords.length > 0) {
        failedCardsRef.current = [];
        learnedCardsRef.current = [];
        cardRefs.current = {};
        isNavigating.current = false;

        setDeck([...groupWords]);
        setShouldResetIndex(true);
      }
    }
  }, [isLoaded, words, groupIndex]);

  // Tutorial overlay açıkken örnek kartı sağa-sola sürekli salla (swipe'ı görsel anlat)
  useEffect(() => {
    if (!showTutorial) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(tutorialAnim, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(tutorialAnim, { toValue: -1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(tutorialAnim, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [showTutorial, tutorialAnim]);

  // Yeni deste geldiğinde Swiper index'ini güvenle 0'a al
  useEffect(() => {
    if (!shouldResetIndex) return;

    if (swiperRef.current) {
      try {
        swiperRef.current.jumpToCardIndex(0);
      } catch (error) {
        // jump başarısız olursa yok say
      }
    }
    setShouldResetIndex(false);
  }, [shouldResetIndex]);

  const handleSwipeLeft = (cardIndex: number) => {
    if (showHint) setShowHint(false); // ilk aksiyon sonrası ipucu kaybolur
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const card = deck[cardIndex];
    if (card) {
      recordStepResult(false);
      if (!failedCardsRef.current.find(c => c.id === card.id)) {
        failedCardsRef.current.push(card);
      }
      setTimeout(() => {
        resetStreak();
        addFailedWord(card.id);
      }, 0);
    }
  };

  const handleSwipeRight = (cardIndex: number) => {
    if (showHint) setShowHint(false); // ilk aksiyon sonrası ipucu kaybolur
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const card = deck[cardIndex];
    if (card) {
      recordStepResult(true);
      if (!learnedCardsRef.current.find(c => c.id === card.id)) {
        learnedCardsRef.current.push(card);
      }
      setTimeout(() => {
        addLearnedWord();
      }, 0);
    }
  };

  const handleSwipedAll = () => {
    // Son kartın animasyonunun bitmesi için kısa bir süre bekle
    setTimeout(() => {
      if (failedCardsRef.current.length > 0) {
        // Bilinemeyen (sola kaydırılan) kartlardan yeni bir deste oluştur.
        // Kullanıcı hepsini sağa kaydırana kadar bu grup tekrar tekrar sorulur.
        const remaining = [...failedCardsRef.current];
        failedCardsRef.current = [];
        learnedCardsRef.current = [];
        cardRefs.current = {};

        // Swiper'ı YIKMADAN desteyi güncelle (memory leak ve çökme önlenir)
        setDeck(remaining);
        setLoopCount(prev => prev + 1); // Kart id key'lerini tazele (ön yüze dönsünler)
        setShouldResetIndex(true);
      } else {
        // Tüm 5 kelime başarıyla öğrenildi → bu grubun eşleştirme oyununa geç
        if (isNavigating.current) return;
        isNavigating.current = true;

        // Bu turun 5 kelimesini eşleştirme ekranına yolla
        const startIdx = groupIndex * GROUP_SIZE;
        const groupWords = words.slice(startIdx, startIdx + GROUP_SIZE);
        setCurrentBatch(groupWords);

        router.push({
          pathname: '/matching',
          params: { level, chapter }
        } as any);
      }
    }, 400);
  };

  // Swiper'ın kendi tıklama yakalayıcısını kullanıp, referans ile karta flip komutu gönderiyoruz
  const handleTapCard = (cardIndex: number) => {
    const card = deck[cardIndex];
    if (card && cardRefs.current[card.id]) {
      cardRefs.current[card.id].flip();
    }
  };

  // Alt aksiyon butonları: swipe ile AYNI sonucu üretir (swiper'ı programatik tetikler).
  // Swiper'ın swipeLeft/swipeRight metodu onSwipedLeft/Right callback'lerini çağırır.
  const handleKnowButton = () => {
    if (showHint) setShowHint(false);
    swiperRef.current?.swipeRight();
  };
  const handleDontKnowButton = () => {
    if (showHint) setShowHint(false);
    swiperRef.current?.swipeLeft();
  };

  // Öğreticiyi kapat ve kalıcı işaretle (bir daha gösterilmez)
  const dismissTutorial = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTutorial(false);
    setSwipeTutorialSeen();
  };

  if (deck.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Shuffling...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashcardHeader level={level as string} chapter={chapter as string} groupIndex={groupIndex} />
      <Swiper
        ref={swiperRef}
        cards={deck}
        containerStyle={styles.swiperContainer}
        renderCard={(card: Word) => {
          if (!card) return <View />;
          return (
            <CardItem
              key={`card-${card.id}-${loopCount}`}
              card={card}
              isTopCard={card.id === deck[0]?.id}
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

      {/* İlk swipe'a kadar görünen küçük ipucu */}
      {showHint && !showTutorial && (
        <View style={styles.hintBar} pointerEvents="none">
          <Text style={styles.hintText}>← Don't know  ·  Know →</Text>
        </View>
      )}

      {/* Swipe'a alternatif alt aksiyon butonları (swipe ile aynı işi yapar) */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnNo]} onPress={handleDontKnowButton}>
          <MaterialCommunityIcons name="close" size={22} color="#F44336" />
          <Text style={[styles.actionBtnText, { color: '#F44336' }]}>DON'T KNOW</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnYes]} onPress={handleKnowButton}>
          <MaterialCommunityIcons name="check" size={22} color="#4CAF50" />
          <Text style={[styles.actionBtnText, { color: '#4CAF50' }]}>I KNOW</Text>
        </TouchableOpacity>
      </View>

      {/* Tek seferlik swipe öğreticisi */}
      {showTutorial && (
        <View style={styles.tutorialOverlay}>
          <Text style={styles.tutorialTitle}>How to study</Text>
          <Animated.View
            style={[
              styles.tutorialCard,
              {
                transform: [
                  { translateX: tutorialAnim.interpolate({ inputRange: [-1, 1], outputRange: [-40, 40] }) },
                  { rotate: tutorialAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] }) },
                ],
              },
            ]}
          >
            <MaterialCommunityIcons name="gesture-swipe-horizontal" size={56} color="#FFD700" />
          </Animated.View>
          <View style={styles.tutorialRow}>
            <View style={styles.tutorialHintItem}>
              <MaterialCommunityIcons name="arrow-left-bold" size={20} color="#F44336" />
              <Text style={styles.tutorialHintText}>Swipe left if you don't know it</Text>
            </View>
            <View style={styles.tutorialHintItem}>
              <MaterialCommunityIcons name="arrow-right-bold" size={20} color="#4CAF50" />
              <Text style={styles.tutorialHintText}>Swipe right if you know it</Text>
            </View>
          </View>
          <Text style={styles.tutorialNote}>You can also tap the card to flip it, or use the buttons below.</Text>
          <TouchableOpacity style={styles.tutorialBtn} onPress={dismissTutorial}>
            <Text style={styles.tutorialBtnText}>GOT IT</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 10 },
  swiperContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 130 : 120,
    bottom: 100, // alt aksiyon butonlarına yer aç
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
  headerSubtitle: { color: '#888', fontSize: 12, marginTop: 4 },
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
  overlayTop: { backgroundColor: '#4CAF50', color: 'white', fontSize: 24, fontWeight: 'bold', padding: 10, borderRadius: 10 },

  // İlk swipe'a kadar görünen ipucu (swiper'ın hemen üstünde)
  hintBar: { position: 'absolute', bottom: 104, left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  hintText: { color: '#888', fontSize: 14, fontWeight: '600' },

  // Alt aksiyon butonları (swipe alternatifi)
  // bottom: cihazın sistem navigasyon çubuğuyla (geri/ana sayfa) çakışmaması için yukarı alındı
  actionRow: {
    position: 'absolute', bottom: 55, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between', zIndex: 5,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 30, borderWidth: 2,
  },
  actionBtnNo: { borderColor: '#F44336', backgroundColor: '#2A0D0D', marginRight: 8 },
  actionBtnYes: { borderColor: '#4CAF50', backgroundColor: '#0E2010', marginLeft: 8 },
  actionBtnText: { fontSize: 15, fontWeight: 'bold', marginLeft: 8 },

  // Tek seferlik öğretici overlay
  tutorialOverlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center',
    padding: 35, zIndex: 50,
  },
  tutorialTitle: { color: '#FFF', fontSize: 26, fontWeight: 'bold', marginBottom: 40 },
  tutorialCard: {
    width: 120, height: 150, borderRadius: 24, backgroundColor: '#0D0D0D',
    borderWidth: 2, borderColor: '#FFD700', justifyContent: 'center', alignItems: 'center',
    marginBottom: 45,
  },
  tutorialRow: { width: '100%', gap: 16, marginBottom: 30 },
  tutorialHintItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  tutorialHintText: { color: '#DDD', fontSize: 16 },
  tutorialNote: { color: '#777', fontSize: 13, textAlign: 'center', marginBottom: 35, paddingHorizontal: 10 },
  tutorialBtn: { backgroundColor: '#FFD700', paddingVertical: 16, paddingHorizontal: 70, borderRadius: 30 },
  tutorialBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});
