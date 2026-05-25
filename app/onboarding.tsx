import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PlacementAnswer, useVocabularyStore } from '../store/useVocabularyStore';
import {
  PlacementQuestion,
  pointsForLevel,
  scoreToLevel,
  selectQuestions,
} from '../utils/placement';

export default function OnboardingScreen() {
  const router = useRouter();
  const setPlacementResult = useVocabularyStore(state => state.setPlacementResult);

  // Teste girince dengeli 10 soru seç (her seviyeden 2). Retake'te yeniden seçilir.
  const [questions, setQuestions] = useState<PlacementQuestion[]>(() => selectQuestions());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<{ level: string; score: number; correct: number } | null>(null);

  const handleAnswer = (selected: string) => {
    const q = questions[currentIndex];
    const isCorrect = selected.toLowerCase() === q.answer.toLowerCase();
    Haptics.notificationAsync(
      isCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    );

    const answer: PlacementAnswer = {
      questionId: q.id,
      word: q.word,
      level: q.level,
      question: q.question,
      options: q.options,
      selectedAnswer: selected,
      correctAnswer: q.answer,
      isCorrect,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finish(nextAnswers);
    }
  };

  const finish = (allAnswers: PlacementAnswer[]) => {
    // Puanlama: her doğru cevap seviyesine göre puan
    let score = 0;
    let correct = 0;
    for (const a of allAnswers) {
      if (a.isCorrect) {
        score += pointsForLevel(a.level as any);
        correct++;
      }
    }
    const level = scoreToLevel(score);

    setPlacementResult({
      recommendedLevel: level,
      score,
      correctCount: correct,
      totalCount: allAnswers.length,
      completedAt: new Date().toISOString(),
      answers: allAnswers,
    });

    setResult({ level, score, correct });
    setFinished(true);
  };

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuestions(selectQuestions());
    setCurrentIndex(0);
    setAnswers([]);
    setResult(null);
    setFinished(false);
  };

  // ---------- SONUÇ EKRANI ----------
  if (finished && result) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.resultScroll}>
        <View style={styles.bubble}>
          <Text style={styles.levelText}>{result.level}</Text>
        </View>
        <Text style={styles.title}>Test Completed!</Text>
        <Text style={styles.scoreText}>Score: {result.correct} / {questions.length}</Text>
        <Text style={styles.subtitle}>Your recommended starting level is {result.level}.</Text>

        <Text style={styles.reviewHeader}>REVIEW ANSWERS</Text>
        <View style={styles.reviewList}>
          {answers.map((a, i) => (
            <View key={i} style={styles.reviewItem}>
              <MaterialCommunityIcons
                name={a.isCorrect ? 'check-circle' : 'close-circle'}
                size={20}
                color={a.isCorrect ? '#4CAF50' : '#F44336'}
              />
              <View style={styles.reviewTextBox}>
                <Text style={styles.reviewWord}>
                  <Text style={styles.reviewLevel}>{a.level} · </Text>{a.word}
                </Text>
                {a.isCorrect ? (
                  <Text style={styles.reviewCorrect}>{a.correctAnswer}</Text>
                ) : (
                  <>
                    <Text style={styles.reviewWrong}>Your answer: {a.selectedAnswer}</Text>
                    <Text style={styles.reviewCorrect}>Correct: {a.correctAnswer}</Text>
                  </>
                )}
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.continueBtn} onPress={() => router.back()}>
          <Text style={styles.continueText}>START LEARNING</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
          <Text style={styles.retakeText}>RETAKE TEST</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ---------- SORU EKRANI ----------
  const q = questions[currentIndex];
  const prompt = q.type === 'gap_fill' ? 'Fill in the blank' : q.type === 'meaning_tr_to_en' ? 'Choose the English word' : 'Choose the meaning';

  return (
    <View style={styles.container}>
      <View style={styles.questionWrap}>
        <Text style={styles.progressText}>Question {currentIndex + 1} of {questions.length}</Text>
        <Text style={styles.levelTag}>{prompt}</Text>

        <View style={styles.questionBox}>
          <Text style={styles.questionText}>{q.question}</Text>
        </View>

        <View style={styles.optionsContainer}>
          {q.options.map((opt, index) => (
            <TouchableOpacity key={index} style={styles.optionBtn} onPress={() => handleAnswer(opt)}>
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  questionWrap: { flex: 1, padding: 30, justifyContent: 'center' },
  progressText: { color: '#888', fontSize: 16, textAlign: 'center', marginBottom: 10 },
  levelTag: { color: '#FFD700', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 40, textTransform: 'uppercase' },

  questionBox: { backgroundColor: '#111', padding: 30, borderRadius: 20, borderWidth: 1, borderColor: '#333', marginBottom: 40 },
  questionText: { color: '#FFF', fontSize: 22, textAlign: 'center', fontWeight: 'bold' },

  optionsContainer: { gap: 15 },
  optionBtn: { backgroundColor: '#222', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#444' },
  optionText: { color: '#FFD700', fontSize: 18, textAlign: 'center', fontWeight: 'bold' },

  // sonuç
  resultScroll: { padding: 30, paddingTop: 70, paddingBottom: 50 },
  bubble: { width: 130, height: 130, borderRadius: 65, backgroundColor: '#FFD700', alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  levelText: { color: '#000', fontSize: 46, fontWeight: '900' },
  title: { color: '#FFF', fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  scoreText: { color: '#FFD700', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#AAA', fontSize: 16, textAlign: 'center', marginBottom: 30 },

  reviewHeader: { color: '#666', fontSize: 13, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 },
  reviewList: { marginBottom: 30 },
  reviewItem: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 14, padding: 15, marginBottom: 10, alignItems: 'flex-start' },
  reviewTextBox: { marginLeft: 12, flex: 1 },
  reviewWord: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 3 },
  reviewLevel: { color: '#FFD700', fontSize: 13 },
  reviewCorrect: { color: '#4CAF50', fontSize: 14 },
  reviewWrong: { color: '#F44336', fontSize: 14 },

  continueBtn: { backgroundColor: '#FFD700', paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginBottom: 12 },
  continueText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  retakeBtn: { paddingVertical: 16, borderRadius: 30, alignItems: 'center', borderWidth: 2, borderColor: '#333' },
  retakeText: { color: '#888', fontSize: 15, fontWeight: 'bold' },
});
