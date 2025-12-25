'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// List of game paths to track
// Matches with the hrefs in page.tsx (without the leading /)
const KNOWN_GAMES = new Set([
    'dreamcatcher',
    'life-suggestions',
    'order-everything',
    'procrastination-simulator',
    'escape-yourself',
    'ai-or-not',
    'logline-slots',
    'who-am-i'
]);

export function GameTracker() {
    const pathname = usePathname();
    const lastTrackedPath = useRef<string | null>(null);

    useEffect(() => {
        if (!pathname) return;

        // Extract the game ID from the path.
        // Assuming structure is /{gameId}
        const gameId = pathname.split('/')[1];

        if (gameId && KNOWN_GAMES.has(gameId)) {
            // Prevent double counting if re-rendering or strict mode, 
            // though effect dependency logic usually handles this.
            // We only want to track unique visits per session/navigation,
            // but typically a page view is a "play" context here.
            // Let's debounce slightly or check refs.

            if (lastTrackedPath.current === pathname) {
                return;
            }

            lastTrackedPath.current = pathname;

            // Fire and forget
            fetch('/api/game-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId }),
            }).catch(err => console.error("Tracking Error:", err));
        }
    }, [pathname]);

    return null;
}
