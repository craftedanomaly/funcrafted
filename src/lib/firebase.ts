/**
 * Firebase Client Library for FunCrafted
 * Handles Firestore operations for leaderboards and game data
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  writeBatch,
  Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== "undefined"
  );
}

function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    console.warn("Firebase not configured - missing environment variables");
    return null;
  }
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

function getDb(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!db) {
    db = getFirestore(firebaseApp);
  }
  return db;
}

// ============================================
// Leaderboard Types
// ============================================

export interface LeaderboardEntry {
  id?: string;
  nickname: string;
  score: number;
  gameId: string;
  createdAt: Date;
}

export interface ScoreRank {
  id?: string;
  minScore: number;
  maxScore: number;
  title: string;
  imageUrl?: string;
  gameId: string;
}

// ============================================
// Leaderboard Functions
// ============================================

const LEADERBOARD_COLLECTION = "leaderboards";
const SCORE_RANKS_COLLECTION = "scoreRanks";

/**
 * Add a new leaderboard entry
 */
export async function addLeaderboardEntry(
  gameId: string,
  nickname: string,
  score: number
): Promise<string> {
  const db = getDb();
  if (!db) throw new Error("Firebase not configured");
  const docRef = await addDoc(collection(db, LEADERBOARD_COLLECTION), {
    gameId,
    nickname: nickname.trim().slice(0, 20),
    score,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

/**
 * Get leaderboard entries for a specific game
 */
export async function getLeaderboard(
  gameId: string,
  limitCount: number = 50
): Promise<LeaderboardEntry[]> {
  const db = getDb();
  if (!db) return [];
  const q = query(
    collection(db, LEADERBOARD_COLLECTION),
    where("gameId", "==", gameId),
    orderBy("score", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate() || new Date(),
  })) as LeaderboardEntry[];
}

/**
 * Delete a leaderboard entry
 */
export async function deleteLeaderboardEntry(entryId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase not configured");
  await deleteDoc(doc(db, LEADERBOARD_COLLECTION, entryId));
}

/**
 * Reset leaderboard for a specific game (delete all entries)
 */
export async function resetLeaderboard(gameId: string): Promise<number> {
  const db = getDb();
  if (!db) throw new Error("Firebase not configured");
  const q = query(
    collection(db, LEADERBOARD_COLLECTION),
    where("gameId", "==", gameId)
  );

  const snapshot = await getDocs(q);
  const batch = writeBatch(db);

  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  await batch.commit();
  return snapshot.size;
}

// ============================================
// Score Ranks Functions
// ============================================

/**
 * Get score ranks for a specific game
 */
export async function getScoreRanks(gameId: string): Promise<ScoreRank[]> {
  const db = getDb();
  if (!db) return [];
  const q = query(
    collection(db, SCORE_RANKS_COLLECTION),
    where("gameId", "==", gameId),
    orderBy("minScore", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as ScoreRank[];
}

/**
 * Set/update a score rank
 */
export async function setScoreRank(rank: ScoreRank): Promise<string> {
  const db = getDb();
  if (!db) throw new Error("Firebase not configured");
  
  if (rank.id) {
    await setDoc(doc(db, SCORE_RANKS_COLLECTION, rank.id), {
      gameId: rank.gameId,
      minScore: rank.minScore,
      maxScore: rank.maxScore,
      title: rank.title,
      imageUrl: rank.imageUrl || "",
    });
    return rank.id;
  } else {
    const docRef = await addDoc(collection(db, SCORE_RANKS_COLLECTION), {
      gameId: rank.gameId,
      minScore: rank.minScore,
      maxScore: rank.maxScore,
      title: rank.title,
      imageUrl: rank.imageUrl || "",
    });
    return docRef.id;
  }
}

/**
 * Delete a score rank
 */
export async function deleteScoreRank(rankId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase not configured");
  await deleteDoc(doc(db, SCORE_RANKS_COLLECTION, rankId));
}

/**
 * Get the rank for a specific score
 */
export async function getRankForScore(
  gameId: string,
  score: number
): Promise<ScoreRank | null> {
  const ranks = await getScoreRanks(gameId);
  return ranks.find((r) => score >= r.minScore && score <= r.maxScore) || null;
}

/**
 * Initialize default score ranks for AI-or-Not
 */
export async function initializeAiOrNotRanks(): Promise<void> {
  const db = getDb();
  if (!db) return;
  const gameId = "ai-or-not";

  const defaultRanks: Omit<ScoreRank, "id">[] = [
    { gameId, minScore: 0, maxScore: 15, title: "Are you a bot?", imageUrl: "" },
    { gameId, minScore: 16, maxScore: 30, title: "You look like a bot...", imageUrl: "" },
    { gameId, minScore: 31, maxScore: 45, title: "AI has taken over your job!", imageUrl: "" },
    { gameId, minScore: 46, maxScore: 60, title: "AI is taking over your job!", imageUrl: "" },
    { gameId, minScore: 61, maxScore: 75, title: "Average Human. There's a feeling in you.", imageUrl: "" },
    { gameId, minScore: 76, maxScore: 90, title: "Human with eyes. Get yourself a cup of coffee.", imageUrl: "" },
    { gameId, minScore: 91, maxScore: 100, title: "My Human, you need a hug!", imageUrl: "" },
    { gameId, minScore: 101, maxScore: 120, title: "The most human human on earth. You are human, for sure!", imageUrl: "" },
  ];

  // Check if ranks already exist
  const existing = await getScoreRanks(gameId);
  if (existing.length > 0) {
    return; // Already initialized
  }

  // Add default ranks
  for (const rank of defaultRanks) {
    await addDoc(collection(db, SCORE_RANKS_COLLECTION), rank);
  }
}

// ============================================
// Game IDs
// ============================================

export const GAME_IDS = {
  AI_OR_NOT: "ai-or-not",
  WHO_AM_I: "who-am-i",
  LOGLINE_CREATOR: "logline-creator",
  ORDER_EVERYTHING: "order-everything",
} as const;

export type GameId = (typeof GAME_IDS)[keyof typeof GAME_IDS];
