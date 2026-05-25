import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useVocabularyStore } from '../store/useVocabularyStore';
import { GROUPS_PER_CHAPTER } from '../utils/wordHelper';

// Fisher-Yates: tarafsız (uniform) karıştırma. sort(()=>Math.random()-0.5) taraflıdır.
function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MatchingGame() {
  const router = useRouter();
  const { level, chapter } = useLocalSearchParams<{ level: string; chapter: string }>();
  const currentBatch = useVocabularyStore(state => state.currentBatch);
  const groupIndex = useVocabularyStore(state => state.groupIndex);
  const nextGroup = useVocabularyStore(state => state.nextGroup);
  const recordStepResult = useVocabularyStore(state => state.recordStepResult);

  const [leftWords, setLeftWords] = useState<any[]>([]);
  const [rightWords, setRightWords] = useState<any[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [errorPair, setErrorPair] = useState<{left: string, right: string} | null>(null);

  useEffect(() => {
    if (currentBatch && currentBatch.length > 0) {
      const left = currentBatch.map(w => ({ id: w.id, text: w.word }));
      const right = currentBatch.map(w => ({ id: w.id, text: w.translation }));

      setLeftWords(shuffle(left));
      setRightWords(shuffle(right));
    }
  }, [currentBatch]);

  useEffect(() => {
    if (selectedLeft && selectedRight) {
      // Doğru mu kontrol et (ID'leri aynıysa doğrudur)
      if (selectedLeft === selectedRight) {
        recordStepResult(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMatchedPairs(prev => [...prev, selectedLeft]);
        setSelectedLeft(null);
        setSelectedRight(null);
      } else {
        recordStepResult(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrorPair({ left: selectedLeft, right: selectedRight });
        
        // Yarım saniye sonra hatayı temizle
        setTimeout(() => {
          setErrorPair(null);
          setSelectedLeft(null);
          setSelectedRight(null);
        }, 500);
      }
    }
  }, [selectedLeft, selectedRight]);

  const allMatched = matchedPairs.length > 0 && matchedPairs.length === leftWords.length;

  const handleContinue = () => {
    // Bölümün son mini-turu (0,1,2) bittiyse başarı ekranına geç
    if (groupIndex >= GROUPS_PER_CHAPTER - 1) {
      router.push({
        pathname: '/success',
        params: { level, chapter }
      } as any);
    } else {
      // Sıradaki 5'li gruba geç ve kartlara dön
      nextGroup();
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MATCH THE WORDS</Text>
      <Text style={styles.subtitle}>Tap one from each side to match</Text>

      <View style={styles.gameArea}>
        {/* SOL SÜTUN (İNGİLİZCE) */}
        <View style={styles.column}>
          {leftWords.map((item) => {
            const isMatched = matchedPairs.includes(item.id);
            const isSelected = selectedLeft === item.id;
            const isError = errorPair?.left === item.id;

            return (
              <TouchableOpacity
                key={`left-${item.id}`}
                disabled={isMatched}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                  isMatched && styles.cardMatched,
                  isError && styles.cardError
                ]}
                onPress={() => setSelectedLeft(item.id)}
              >
                <Text style={[styles.cardText, isMatched && styles.textMatched]}>
                  {item.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SAĞ SÜTUN (TÜRKÇE) */}
        <View style={styles.column}>
          {rightWords.map((item) => {
            const isMatched = matchedPairs.includes(item.id);
            const isSelected = selectedRight === item.id;
            const isError = errorPair?.right === item.id;

            return (
              <TouchableOpacity
                key={`right-${item.id}`}
                disabled={isMatched}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                  isMatched && styles.cardMatched,
                  isError && styles.cardError
                ]}
                onPress={() => setSelectedRight(item.id)}
              >
                <Text style={[styles.cardText, isMatched && styles.textMatched]}>
                  {item.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {allMatched && (
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueText}>CONTINUE</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 80, paddingHorizontal: 20 },
  title: { color: '#FFD700', fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 40, marginTop: 10 },
  gameArea: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { width: '48%' },
  
  card: {
    backgroundColor: '#111',
    paddingVertical: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    height: 70
  },
  cardSelected: {
    borderColor: '#FFD700',
    backgroundColor: '#1A1800'
  },
  cardMatched: {
    borderColor: '#4CAF50',
    backgroundColor: '#0E2010'
  },
  cardError: {
    borderColor: '#F44336',
    backgroundColor: '#2A0D0D'
  },
  cardText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  textMatched: {
    color: '#4CAF50'
  },
  
  continueBtn: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    borderRadius: 30,
    marginTop: 40,
    alignItems: 'center'
  },
  continueText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold'
  }
});