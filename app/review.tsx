import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// @ts-ignore
import Swiper from 'react-native-deck-swiper';

const { width, height } = Dimensions.get('window');

import { useVocabularyStore, Word } from '../store/useVocabularyStore';
import { getWordsByIds } from '../utils/wordHelper';

// Kart bileşeni (flashcards ile aynı tasarım, tap-to-flip)
const CardItem = forwardRef(({ card }: { card: Word }, ref) => {
  const [flipped, setFlipped] = useState(false);

  useImperativeHandle(ref, () => ({
    flip: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFlipped(prev => !prev);
    }
  }));

  useEffect(() => { setFlipped(false); }, [card.id]);

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
            {(card.synonyms?.length > 0 || card.opposites?.length > 0) && (
              <View style={styles.infoBox}>
                {card.synonyms?.length > 0 && (
                  <>
                    <Text style={styles.infoLabel}>SYNONYMS</Text>
                    <Text style={styles.infoValue}>{card.synonyms.join(', ')}</Text>
                  </>
                )}
                {card.synonyms?.length > 0 && card.opposites?.length > 0 && <View style={styles.line} />}
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

export default function ReviewScreen() {
  const router = useRouter();
  const failedWords = useVocabularyStore(state => state.failedWords);
  const removeFailedWord = useVocabularyStore(state => state.removeFailedWord);

  // Ekran açıldığındaki zor kelime listesini sabitle (review sırasında değişmesin)
  const [deck] = useState<Word[]>(() => getWordsByIds(Object.keys(failedWords)));
  const [done, setDone] = useState(false);
  const cardRefs = useRef<Record<string, any>>({});

  const handleSwipeRight = (cardIndex: number) => {
    // Doğru bilindi → zor kelimeler listesinden çıkar
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const card = deck[cardIndex];
    if (card) removeFailedWord(card.id);
  };

  const handleSwipeLeft = () => {
    // Hâlâ zor → listede kalsın (bir şey yapma)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTapCard = (cardIndex: number) => {
    const card = deck[cardIndex];
    if (card && cardRefs.current[card.id]) cardRefs.current[card.id].flip();
  };

  const handleFinish = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  };

  // Hiç zor kelime yoksa
  if (deck.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="check-circle-outline" size={80} color="#4CAF50" />
        <Text style={styles.emptyTitle}>No words to review!</Text>
        <Text style={styles.emptySub}>Words you swipe "Again" will appear here for practice.</Text>
        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
          <Text style={styles.finishBtnText}>BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleFinish}>
          <MaterialCommunityIcons name="close" size={30} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review · Hard Words</Text>
        <View style={{ width: 30 }} />
      </View>

      {!done ? (
        <Swiper
          cards={deck}
          containerStyle={styles.swiperContainer}
          renderCard={(card: Word) => {
            if (!card) return <View />;
            return (
              <CardItem
                key={`review-${card.id}`}
                card={card}
                ref={(el) => { if (el) cardRefs.current[card.id] = el; }}
              />
            );
          }}
          onSwipedRight={handleSwipeRight}
          onSwipedLeft={handleSwipeLeft}
          onSwipedTop={handleSwipeRight}
          onSwipedBottom={handleSwipeLeft}
          onTapCard={handleTapCard}
          onSwipedAll={() => setDone(true)}
          overlayLabels={{
            left: { title: 'STILL HARD', style: { label: styles.overlayLeft, wrapper: styles.overlayWrapperLeft } },
            right: { title: 'GOT IT', style: { label: styles.overlayRight, wrapper: styles.overlayWrapperRight } },
          }}
          backgroundColor={'#000'}
          stackSize={3}
          cardVerticalMargin={25}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="trophy-award" size={80} color="#FFD700" />
          <Text style={styles.emptyTitle}>Review complete!</Text>
          <Text style={styles.emptySub}>Great job practicing your hard words.</Text>
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishBtnText}>DONE</Text>
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
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 25, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 18,
    alignItems: 'center', zIndex: 10, minHeight: 110, backgroundColor: 'rgba(0,0,0,0.18)',
  },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  emptyContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { color: '#FFF', fontSize: 26, fontWeight: 'bold', marginTop: 20, textAlign: 'center' },
  emptySub: { color: '#888', fontSize: 15, marginTop: 12, textAlign: 'center', lineHeight: 22 },

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
  overlayLeft: { backgroundColor: '#F44336', color: 'white', fontSize: 22, fontWeight: 'bold', padding: 10, borderRadius: 10 },
  overlayRight: { backgroundColor: '#4CAF50', color: 'white', fontSize: 22, fontWeight: 'bold', padding: 10, borderRadius: 10 },

  finishBtn: { backgroundColor: '#FFD700', paddingVertical: 16, paddingHorizontal: 50, borderRadius: 30, marginTop: 30 },
  finishBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});
