import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Örnek seviye belirleme soruları (PDF'ler geldiğinde gerçekleriyle değiştirilecek)
const questions = [
  { level: 'A1', question: 'I ___ an apple every day.', options: ['eat', 'eats', 'eating', 'ate'], answer: 'eat' },
  { level: 'A1', question: 'She ___ a car.', options: ['have', 'has', 'having', 'had'], answer: 'has' },
  { level: 'A2', question: 'We ___ to the cinema yesterday.', options: ['go', 'goes', 'went', 'gone'], answer: 'went' },
  { level: 'A2', question: 'I have ___ been to Paris.', options: ['ever', 'never', 'always', 'yet'], answer: 'never' },
  { level: 'B1', question: 'If it rains, we ___ at home.', options: ['will stay', 'stay', 'stayed', 'would stay'], answer: 'will stay' },
  { level: 'B1', question: 'The letter ___ by John.', options: ['wrote', 'written', 'was written', 'is write'], answer: 'was written' }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [assignedLevel, setAssignedLevel] = useState('A1');

  const handleAnswer = (selectedOption: string) => {
    const currentQ = questions[currentQIndex];
    
    if (selectedOption === currentQ.answer) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore(score + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      calculateLevel();
    }
  };

  const calculateLevel = () => {
    // Çok basit bir algoritma: Yüksek puana göre seviye ver
    let level = 'A1';
    if (score >= 2) level = 'A2';
    if (score >= 4) level = 'B1';
    if (score >= 6) level = 'B2';
    
    setAssignedLevel(level);
    setFinished(true);
  };

  if (finished) {
    return (
      <View style={styles.container}>
        <View style={styles.bubble}>
          <Text style={styles.levelText}>{assignedLevel}</Text>
        </View>
        <Text style={styles.title}>Test Completed!</Text>
        <Text style={styles.subtitle}>Your recommended starting level is {assignedLevel}.</Text>
        
        <TouchableOpacity style={styles.continueBtn} onPress={() => router.back()}>
          <Text style={styles.continueText}>START LEARNING</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const q = questions[currentQIndex];

  return (
    <View style={styles.container}>
      <Text style={styles.progressText}>Question {currentQIndex + 1} of {questions.length}</Text>
      <Text style={styles.levelTag}>{q.level} Level</Text>
      
      <View style={styles.questionBox}>
        <Text style={styles.questionText}>{q.question}</Text>
      </View>

      <View style={styles.optionsContainer}>
        {q.options.map((opt, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.optionBtn}
            onPress={() => handleAnswer(opt)}
          >
            <Text style={styles.optionText}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 30, justifyContent: 'center' },
  progressText: { color: '#888', fontSize: 16, textAlign: 'center', marginBottom: 10 },
  levelTag: { color: '#FFD700', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  
  questionBox: { backgroundColor: '#111', padding: 30, borderRadius: 20, borderWidth: 1, borderColor: '#333', marginBottom: 40 },
  questionText: { color: '#FFF', fontSize: 22, textAlign: 'center', fontWeight: 'bold' },
  
  optionsContainer: { gap: 15 },
  optionBtn: { backgroundColor: '#222', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#444' },
  optionText: { color: '#FFD700', fontSize: 18, textAlign: 'center', fontWeight: 'bold' },

  bubble: { 
    width: 150, height: 150, borderRadius: 75, backgroundColor: '#FFD700', 
    alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 30 
  },
  levelText: { color: '#000', fontSize: 50, fontWeight: '900' },
  title: { color: '#FFF', fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  subtitle: { color: '#AAA', fontSize: 18, textAlign: 'center', marginBottom: 50 },
  
  continueBtn: { backgroundColor: '#FFD700', paddingVertical: 18, borderRadius: 30, alignItems: 'center' },
  continueText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});