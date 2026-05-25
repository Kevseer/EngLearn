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

// Seviye tespit (placement) testi sonucu — kalıcı saklanır
export interface PlacementAnswer {
  questionId: string;
  word: string;
  level: string;
  question: string;
  options: string[];
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}
export interface PlacementResult {
  recommendedLevel: string;
  score: number;
  correctCount: number;
  totalCount: number;
  completedAt: string;
  answers: PlacementAnswer[];
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

  // O anki mini-tur (5 kelime) ve hangi tur olduğumuz (0, 1, 2)
  currentBatch: Word[];
  groupIndex: number;

  // Streak sistemi
  streak: number;
  lastStreakDate: string | null; // YYYY-MM-DD formatında

  // Onboarding seviye belirleme testinin önerdiği seviye (kalıcı)
  userLevel: string | null;

  // Tamamlanan bölümler (kalıcı): { 'A2-11': true } biçiminde, key = `${level}-${chapter}`
  completedChapters: Record<string, boolean>;

  // Seviye tespit testi son sonucu (kalıcı; Home'da gösterilir, sonuç ekranında review edilir)
  placementResult: PlacementResult | null;

  // Flashcard swipe öğreticisi gösterildi mi? (kalıcı; sadece bir kez gösterilir)
  hasSeenSwipeTutorial: boolean;

  loadChapter: (level: string, chapter: number, chapterData: any) => void;
  addFailedWord: (wordId: string) => void;
  removeFailedWord: (wordId: string) => void;
  clearFailedWords: () => void;
  recordStepResult: (isCorrect: boolean) => void;
  resetChapterProgress: () => void;
  setCurrentBatch: (batch: Word[]) => void;
  nextGroup: () => void;
  addLearnedWord: () => void;
  resetStreak: () => void;
  resetStreakIfNewDay: () => void;
  setUserLevel: (level: string) => void;
  markChapterComplete: (level: string, chapter: number) => void;
  isChapterComplete: (level: string, chapter: number) => boolean;
  setPlacementResult: (result: PlacementResult) => void;
  setSwipeTutorialSeen: () => void;
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
      groupIndex: 0,

      streak: 0,
      lastStreakDate: null,

      userLevel: null,
      completedChapters: {},
      placementResult: null,
      hasSeenSwipeTutorial: false,

      loadChapter: (level, chapter, chapterData) => {
        // Madde 3'teki çelişkiyi çözüyoruz: Kelimelerin sabit sırada gelmesi için karıştırma yapmıyoruz
        const words = [...chapterData.words];
        
        set({
          level,
          chapter,
          words,
          reading: chapterData.reading || null,
          groupIndex: 0,
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

      // Review modunda kelime doğru bilinince zor kelimeler listesinden çıkar
      removeFailedWord: (wordId) => set((state) => {
        const { [wordId]: _removed, ...rest } = state.failedWords;
        return { failedWords: rest };
      }),

      clearFailedWords: () => set({ failedWords: {} }),
      recordStepResult: (isCorrect) => set((state) => ({
        totalSteps: state.totalSteps + 1,
        wrongAnswers: isCorrect ? state.wrongAnswers : state.wrongAnswers + 1,
      })),
      resetChapterProgress: () => set({ totalSteps: 0, wrongAnswers: 0 }),

      setCurrentBatch: (batch) => set({ currentBatch: batch }),
      // Sıradaki mini-tura (5 kelime) geç
      nextGroup: () => set((state) => ({ groupIndex: state.groupIndex + 1, currentBatch: [] })),
      
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

      // Onboarding testinin önerdiği seviyeyi kalıcı kaydet
      setUserLevel: (level) => set({ userLevel: level }),

      // Bir bölümü tamamlandı işaretle (reading'de "FINISH CHAPTER" sonrası)
      markChapterComplete: (level, chapter) => set((state) => ({
        completedChapters: { ...state.completedChapters, [`${level}-${chapter}`]: true },
      })),

      // Bir bölüm tamamlandı mı? (ana ekranda yeşil göstermek için)
      isChapterComplete: (level, chapter) => !!get().completedChapters[`${level}-${chapter}`],

      // Seviye tespit testi sonucunu kaydet; önerilen seviyeyi userLevel olarak da ayarla
      setPlacementResult: (result) => set({ placementResult: result, userLevel: result.recommendedLevel }),

      // Swipe öğreticisi gösterildi olarak işaretle (bir daha gösterilmez)
      setSwipeTutorialSeen: () => set({ hasSeenSwipeTutorial: true }),
    }),
    {
      name: 'vocabulary-storage', // AsyncStorage'da bu isimle kaydedilecek
      storage: createJSONStorage(createSafeAsyncStorage),
      // failedWords, streak, lastStreakDate, userLevel, completedChapters, placementResult kalıcı; aktif chapter verisi RAM'de
      partialize: (state) => ({ failedWords: state.failedWords, streak: state.streak, lastStreakDate: state.lastStreakDate, userLevel: state.userLevel, completedChapters: state.completedChapters, placementResult: state.placementResult, hasSeenSwipeTutorial: state.hasSeenSwipeTutorial }),
    }
  )
);