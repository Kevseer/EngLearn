// placement.ts — Seviye tespit testi mantığı (soru seçimi + puanlama).
// Soru bankası: assets/data/placement.json (scripts/buildPlacement.js ile üretilir).
// Backend yok — tamamen lokal.

// @ts-ignore
import bank from '../assets/data/placement.json';

export type PlacementLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type PlacementType = 'meaning_en_to_tr' | 'meaning_tr_to_en' | 'gap_fill';

export interface PlacementQuestion {
  id: string;
  level: PlacementLevel;
  type: PlacementType;
  word: string;
  question: string;
  options: string[];
  answer: string;
}

const LEVELS: PlacementLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
const LEVEL_POINTS: Record<PlacementLevel, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 };

const allQuestions: PlacementQuestion[] = (bank as any).questions;

// Bir diziden rastgele n benzersiz eleman seç
function pickRandom<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

// Dengeli 10 soru: her seviyeden 2 (toplam 10), karıştırılmış, çakışmasız.
// Her sorunun şıkları da ayrıca karıştırılır.
export function selectQuestions(): PlacementQuestion[] {
  const selected: PlacementQuestion[] = [];
  for (const level of LEVELS) {
    const pool = allQuestions.filter(q => q.level === level);
    selected.push(...pickRandom(pool, 2));
  }
  const shuffled = pickRandom(selected, selected.length); // 10'u kendi içinde karıştır
  // her sorunun şıklarını da karıştır (orijinali bozmadan kopya)
  return shuffled.map(q => ({ ...q, options: pickRandom(q.options, q.options.length) }));
}

// Puanlama: her doğru cevap seviyesine göre puan. Maks 30 (2×(1+2+3+4+5)).
export function scoreToLevel(score: number): PlacementLevel {
  if (score <= 5) return 'A1';
  if (score <= 11) return 'A2';
  if (score <= 17) return 'B1';
  if (score <= 24) return 'B2';
  return 'C1';
}

export function pointsForLevel(level: PlacementLevel): number {
  return LEVEL_POINTS[level];
}
