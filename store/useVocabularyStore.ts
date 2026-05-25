import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const createSafeAsyncStorage = () => ({
  getItem: async (name: string) => {
    try {
      return await AsyncStorage.getItem(name);
    } catch (error) {
      console.warn('AsyncStorage unavailable, using fallback storage:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (error) {
      console.warn('AsyncStorage unavailable, skipping persist write:', error);
    }
  },
  removeItem: async (name: string) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      console.warn('AsyncStorage unavailable, skipping remove:', error);
    }
  },
});

export interface Word {
  id: string;
  word: string;
  translation: string;
  meanings: string[];
  sentence: string;
  synonyms: string[];
  opposites: string[];
}

export interface Reading {
  title: string;
  text: string;
  translation: string;
}

interface VocabularyState {
  level: string | null;
  chapter: number | null;
  words: Word[];
  reading: Reading | null;
  // failedWords kalıcı hafızada (AsyncStorage) tutulacak: { 'A1-1-1': 2, 'A1-1-3': 1 } (Kelime ID'si ve hata sayısı)
  failedWords: Record<string, number>; 

  totalSteps: number;
  wrongAnswers: number;

  currentBatch: Word[];
  batchIndex: number;
  
  // Streak sistemi
  streak: number;
  lastStreakDate: string | null; // YYYY-MM-DD formatında
  
  loadChapter: (level: string, chapter: number, chapterData: any) => void;
  addFailedWord: (wordId: string) => void;
  clearFailedWords: () => void;
  recordStepResult: (isCorrect: boolean) => void;
  resetChapterProgress: () => void;
  setCurrentBatch: (batch: Word[]) => void;
  nextBatch: () => void;
  addLearnedWord: () => void;
  resetStreak: () => void;
  resetStreakIfNewDay: () => void;
}

export const useVocabularyStore = create<VocabularyState>()(
  persist(
    (set, get) => ({
      level: null,
      chapter: null,
      words: [],
      reading: null,
      failedWords: {},
      totalSteps: 0,
      wrongAnswers: 0,
      
      currentBatch: [],
      batchIndex: 0,
      
      streak: 0,
      lastStreakDate: null,

      loadChapter: (level, chapter, chapterData) => {
        // Madde 3'teki çelişkiyi çözüyoruz: Kelimelerin sabit sırada gelmesi için karıştırma yapmıyoruz
        const words = [...chapterData.words];
        
        set({
          level,
          chapter,
          words,
          reading: chapterData.reading || null,
          batchIndex: 0,
          currentBatch: [],
          totalSteps: 0,
          wrongAnswers: 0,
        });
      },

      addFailedWord: (wordId) => set((state) => {
        const currentCount = state.failedWords[wordId] || 0;
        return {
          failedWords: {
            ...state.failedWords,
            [wordId]: currentCount + 1,
          },
        };
      }),

      clearFailedWords: () => set({ failedWords: {} }),
      recordStepResult: (isCorrect) => set((state) => ({
        totalSteps: state.totalSteps + 1,
        wrongAnswers: isCorrect ? state.wrongAnswers : state.wrongAnswers + 1,
      })),
      resetChapterProgress: () => set({ totalSteps: 0, wrongAnswers: 0 }),

      setCurrentBatch: (batch) => set({ currentBatch: batch }),
      nextBatch: () => set((state) => ({ batchIndex: state.batchIndex + 1, currentBatch: [] })),
      
      addLearnedWord: () => set((state) => {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const isSameDay = state.lastStreakDate === today;
        return {
          streak: isSameDay ? state.streak + 1 : 1,
          lastStreakDate: today,
        };
      }),
      
      resetStreak: () => set({ streak: 0, lastStreakDate: null }),
      
      resetStreakIfNewDay: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        if (state.lastStreakDate && state.lastStreakDate !== today) {
          set({ streak: 0, lastStreakDate: null });
        }
      },
    }),
    {
      name: 'vocabulary-storage', // AsyncStorage'da bu isimle kaydedilecek
      storage: createJSONStorage(createSafeAsyncStorage),
      // failedWords, streak ve lastStreakDate kalıcı olsun, diğerleri (aktif chapter verisi) RAM'de tutulsun
      partialize: (state) => ({ failedWords: state.failedWords, streak: state.streak, lastStreakDate: state.lastStreakDate }),
    }
  )
);