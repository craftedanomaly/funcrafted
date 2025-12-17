"use client";

import { useState, useEffect, useCallback } from "react";
import { ACHIEVEMENTS, AchievementId } from "./constants";

const STORAGE_KEY = "order-everything-achievements";
const LIFETIME_SCORE_KEY = "order-everything-lifetime-score";
const ORDER_COUNT_KEY = "order-everything-order-count";
const LAST_ITEM_KEY = "order-everything-last-item";

export interface Achievement {
  id: AchievementId;
  name: string;
  desc: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

export function useAchievements() {
  const [unlockedIds, setUnlockedIds] = useState<Set<AchievementId>>(new Set());
  const [lifetimeScore, setLifetimeScore] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [lastItem, setLastItem] = useState<string | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const ids = JSON.parse(stored) as AchievementId[];
        setUnlockedIds(new Set(ids));
      } catch (e) {
        console.error("Failed to parse achievements:", e);
      }
    }

    const storedScore = localStorage.getItem(LIFETIME_SCORE_KEY);
    if (storedScore) {
      setLifetimeScore(parseInt(storedScore) || 0);
    }

    const storedCount = localStorage.getItem(ORDER_COUNT_KEY);
    if (storedCount) {
      setOrderCount(parseInt(storedCount) || 0);
    }

    const storedLastItem = localStorage.getItem(LAST_ITEM_KEY);
    if (storedLastItem) {
      setLastItem(storedLastItem);
    }
  }, []);

  // Save to localStorage when unlocked changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (unlockedIds.size > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlockedIds]));
    }
  }, [unlockedIds]);

  // Get all achievements with unlock status
  const getAllAchievements = useCallback((): Achievement[] => {
    return Object.values(ACHIEVEMENTS).map((ach) => ({
      ...ach,
      unlocked: unlockedIds.has(ach.id),
    }));
  }, [unlockedIds]);

  // Unlock achievements and track order
  const processOrder = useCallback((
    itemName: string,
    carbonScore: number,
    achievementIds: AchievementId[]
  ): Achievement[] => {
    const newUnlocks: Achievement[] = [];
    const updatedIds = new Set(unlockedIds);

    // Check for FIRST_BUY
    if (orderCount === 0) {
      achievementIds = [...achievementIds, "ACH_FIRST_BUY" as AchievementId];
    }

    // Check for INFINITE_LOOPER (same item twice)
    if (lastItem && lastItem.toLowerCase() === itemName.toLowerCase()) {
      achievementIds = [...achievementIds, "ACH_LOOPER" as AchievementId];
    }

    // Check for OCEAN_CHOKER (5 orders in a row)
    if (orderCount + 1 >= 5) {
      achievementIds = [...achievementIds, "ACH_OCEAN" as AchievementId];
    }

    // Check for GAME_OVER (1 million lifetime)
    const newLifetimeScore = lifetimeScore + carbonScore;
    if (newLifetimeScore >= 1000000) {
      achievementIds = [...achievementIds, "ACH_GAME_OVER" as AchievementId];
    }

    // Process all achievements
    for (const id of achievementIds) {
      if (!updatedIds.has(id)) {
        updatedIds.add(id);
        const achDef = Object.values(ACHIEVEMENTS).find((a) => a.id === id);
        if (achDef) {
          newUnlocks.push({
            ...achDef,
            unlocked: true,
            unlockedAt: new Date(),
          });
        }
      }
    }

    // Update state
    setUnlockedIds(updatedIds);
    setLifetimeScore(newLifetimeScore);
    setOrderCount((prev) => prev + 1);
    setLastItem(itemName);
    setNewlyUnlocked(newUnlocks);

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...updatedIds]));
      localStorage.setItem(LIFETIME_SCORE_KEY, String(newLifetimeScore));
      localStorage.setItem(ORDER_COUNT_KEY, String(orderCount + 1));
      localStorage.setItem(LAST_ITEM_KEY, itemName);
    }

    return newUnlocks;
  }, [unlockedIds, lifetimeScore, orderCount, lastItem]);

  // Clear newly unlocked (after showing toast)
  const clearNewlyUnlocked = useCallback(() => {
    setNewlyUnlocked([]);
  }, []);

  // Reset all progress
  const resetProgress = useCallback(() => {
    setUnlockedIds(new Set());
    setLifetimeScore(0);
    setOrderCount(0);
    setLastItem(null);
    setNewlyUnlocked([]);

    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LIFETIME_SCORE_KEY);
      localStorage.removeItem(ORDER_COUNT_KEY);
      localStorage.removeItem(LAST_ITEM_KEY);
    }
  }, []);

  return {
    unlockedIds,
    lifetimeScore,
    orderCount,
    newlyUnlocked,
    getAllAchievements,
    processOrder,
    clearNewlyUnlocked,
    resetProgress,
    unlockedCount: unlockedIds.size,
    totalCount: Object.keys(ACHIEVEMENTS).length,
  };
}
