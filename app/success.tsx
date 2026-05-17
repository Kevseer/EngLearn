import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function SuccessScreen() {
  const router = useRouter();
  const { level, chapter } = useLocalSearchParams<{ level: string; chapter: string }>();

  useEffect(() => {
    // Ekran açıldığında başarı hissi veren bir titreşim tetikle
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleGoToStory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Kullanıcı hazır hissettiğinde Reading ekranına geçiş yapar
    router.push({
      pathname: '/reading',
      params: { level, chapter }
    } as any);
  };

  const handleBackToMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Tüm ekranları kapatıp ana menüye döner
    router.dismissAll();
    router.push('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="trophy-award" size={80} color="#FFD700" />
        </View>
        
        <Text style={styles.title}>AWESOME JOB!</Text>
        <Text style={styles.subtitle}>
          You have successfully learned all the words for {level} - Chapter {chapter}.
        </Text>

        {/* İstatistik / Ödül Kartları */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="target" size={28} color="#4CAF50" />
            <Text style={styles.statValue}>100%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="fire" size={28} color="#FFD700" />
            <Text style={styles.statValue}>+15</Text>
            <Text style={styles.statLabel}>Words</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.storyBtn} onPress={handleGoToStory}>
          <Text style={styles.storyBtnText}>GO TO STORY</Text>
          <MaterialCommunityIcons name="arrow-right-thick" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuBtn} onPress={handleBackToMenu}>
          <Text style={styles.menuBtnText}>BACK TO MENU</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 30 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  iconCircle: { 
    width: 140, height: 140, borderRadius: 70, 
    backgroundColor: '#1A1800', borderWidth: 2, borderColor: '#FFD700',
    justifyContent: 'center', alignItems: 'center', marginBottom: 30 
  },
  
  title: { color: '#FFF', fontSize: 32, fontWeight: '900', marginBottom: 15, textAlign: 'center' },
  subtitle: { color: '#AAA', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 40, paddingHorizontal: 20 },
  
  statsContainer: { 
    flexDirection: 'row', backgroundColor: '#111', 
    borderRadius: 20, padding: 20, width: '100%', 
    justifyContent: 'space-around', alignItems: 'center',
    borderWidth: 1, borderColor: '#222'
  },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  statLabel: { color: '#888', fontSize: 14, marginTop: 5 },
  divider: { width: 1, height: '80%', backgroundColor: '#333' },
  
  footer: { paddingBottom: 20 },
  
  storyBtn: { 
    backgroundColor: '#FFD700', paddingVertical: 18, borderRadius: 30, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 
  },
  storyBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold', marginRight: 10 },
  
  menuBtn: { 
    paddingVertical: 18, borderRadius: 30, 
    borderWidth: 2, borderColor: '#333',
    justifyContent: 'center', alignItems: 'center' 
  },
  menuBtnText: { color: '#888', fontSize: 16, fontWeight: 'bold' }
});