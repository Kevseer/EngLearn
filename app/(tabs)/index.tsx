import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getChapters } from '../../utils/wordHelper';

const { width } = Dimensions.get('window');

const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];

export default function LevelsScreen() {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const renderChapters = (level: string) => {
    const chapters = getChapters(level);
    if (chapters.length === 0) {
      return (
        <View style={styles.comingSoonBox}>
          <Text style={styles.comingSoon}>This level will be added soon.</Text>
        </View>
      );
    }

    return (
      <View style={styles.chaptersGrid}>
        {chapters.map(ch => (
          <TouchableOpacity 
            key={ch} 
            style={styles.chapterBtn}
            // Expo Router'ın tip uyarılarını susturmak için 'as any' ve String(ch) kullanıyoruz
            onPress={() => router.push(({
              pathname: '/flashcards',
              params: { level, chapter: String(ch) }
            }) as any)}
          >
            <Text style={styles.chapterBtnText}>Ch {ch}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerPadding} />
        
        {/* Ortalanmış Arı Görseli */}
        <Image 
          // @ts-ignore
          source={require('../../assets/bee.png')} 
          style={styles.alignedBee} 
        />
        
        <Text style={styles.menuTitle}>CHOOSE YOUR LEVEL</Text>

        <TouchableOpacity 
          style={styles.placementBtn} 
          onPress={() => router.push('/onboarding' as any)}
        >
          <MaterialCommunityIcons name="help-circle-outline" size={24} color="#000" />
          <Text style={styles.placementBtnText}>FIND MY LEVEL</Text>
        </TouchableOpacity>

        {levels.map((lvl) => (
          <View key={lvl}>
            <TouchableOpacity 
              style={[styles.sectionCard, selectedLevel === lvl && styles.sectionCardActive]} 
              onPress={() => setSelectedLevel(selectedLevel === lvl ? null : lvl)}
            >
              <View>
                <Text style={styles.sectionText}>{lvl} VOCABULARY</Text>
                <Text style={styles.sectionSub}>Oxford Word List</Text>
              </View>
              <MaterialCommunityIcons 
                name={selectedLevel === lvl ? "chevron-up" : "chevron-down"} 
                size={36} 
                color="#FFD700" 
              />
            </TouchableOpacity>
            
            {/* Seçili Seviyenin Bölümlerini Göster */}
            {selectedLevel === lvl && renderChapters(lvl)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { paddingHorizontal: 30, paddingBottom: 50 },
  headerPadding: { height: 60 },
  alignedBee: { 
    width: 180, 
    height: 180, 
    alignSelf: 'center', 
    marginTop: 10,
    marginBottom: 40,
    resizeMode: 'contain'
  },
  menuTitle: { 
    color: '#FFD700', 
    fontSize: 26, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 40, 
    textTransform: 'uppercase' 
  },
  placementBtn: {
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 30,
    marginBottom: 30,
  },
  placementBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10
  },
  sectionCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#111', 
    padding: 25, 
    borderRadius: 25, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#222' 
  },
  sectionCardActive: {
    borderColor: '#FFD700',
    backgroundColor: '#1A1800'
  },
  sectionText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  sectionSub: { color: '#666', fontSize: 13, marginTop: 4 },
  
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 5
  },
  chapterBtn: {
    backgroundColor: '#222',
    width: '30%',
    paddingVertical: 15,
    borderRadius: 15,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  chapterBtnText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16
  },
  comingSoonBox: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 20
  },
  comingSoon: {
    color: '#555',
    fontStyle: 'italic'
  }
});