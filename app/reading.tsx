import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useVocabularyStore } from '../store/useVocabularyStore';

export default function ReadingScreen() {
  const router = useRouter();
  const { level, chapter } = useLocalSearchParams<{ level: string; chapter: string }>();
  const reading = useVocabularyStore(state => state.reading);
  const markChapterComplete = useVocabularyStore(state => state.markChapterComplete);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleFinish = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Bölümü tamamlandı olarak kalıcı işaretle (ana ekranda yeşil görünür)
    if (level && chapter) markChapterComplete(level as string, Number(chapter));
    router.dismissAll();
    router.push('/');
  };

  const toggleTranslation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTranslation(prev => !prev);
  };

  if (!reading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Story...</Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleFinish}>
          <Text style={styles.backBtnText}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 30 }} />
        <Text style={styles.headerTitle}>{`${level ?? ''} - Chapter ${chapter ?? ''}`}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="book-open-page-variant" size={50} color="#FFD700" />
        </View>

        <Text style={styles.storyTitle}>{String(reading.title)}</Text>
        
        <View style={styles.storyBox}>
          <Text style={styles.storyText}>{String(reading.text)}</Text>
        </View>

        <TouchableOpacity style={styles.translationToggleBtn} onPress={toggleTranslation}>
          <MaterialCommunityIcons name="translate" size={20} color="#FFD700" />
          <Text style={styles.translationToggleText}>
            {showTranslation ? "HIDE TRANSLATION" : "SHOW TRANSLATION"}
          </Text>
        </TouchableOpacity>

        {showTranslation && (
          <View style={styles.translationBox}>
            <Text style={styles.translationText}>{String(reading.translation)}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
          <Text style={styles.finishBtnText}>FINISH CHAPTER</Text>
          <MaterialCommunityIcons name="check-circle" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFD700', fontSize: 20, marginBottom: 20 },
  backBtn: { backgroundColor: '#222', padding: 15, borderRadius: 15 },
  backBtnText: { color: '#FFF', fontWeight: 'bold' },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 25, 
    paddingTop: Platform.OS === 'ios' ? 60 : 50, 
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  scrollContent: { padding: 25, paddingBottom: 100 },
  
  iconCircle: { 
    width: 90, height: 90, borderRadius: 45, 
    backgroundColor: '#1A1800', borderWidth: 1, borderColor: '#FFD700',
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center',
    marginBottom: 20, marginTop: 10
  },
  
  storyTitle: { color: '#FFD700', fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 25 },
  
  storyBox: { backgroundColor: '#111', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#222', marginBottom: 20 },
  storyText: { color: '#FFF', fontSize: 18, lineHeight: 28 },

  translationToggleBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    backgroundColor: '#1A1A1A', padding: 15, borderRadius: 15, marginBottom: 20,
    borderWidth: 1, borderColor: '#333'
  },
  translationToggleText: { color: '#FFD700', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },

  translationBox: { backgroundColor: '#1A1800', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#FFD700', marginBottom: 20 },
  translationText: { color: '#DDD', fontSize: 16, lineHeight: 26, fontStyle: 'italic' },

  footer: { 
    padding: 25, 
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#111'
  },
  finishBtn: {
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 30,
  },
  finishBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10
  }
});
