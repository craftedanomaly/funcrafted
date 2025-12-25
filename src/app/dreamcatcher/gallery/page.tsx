'use client';

import React, { useEffect, useState, useRef } from 'react';
import styles from '../dream.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, X, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { DreamEntry } from '@/lib/firebase';

export default function GalleryPage() {
    const [dreams, setDreams] = useState<DreamEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDream, setSelectedDream] = useState<DreamEntry | null>(null);

    // Audio state (Music continues from main page)
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [audioStarted, setAudioStarted] = useState(false);

    useEffect(() => {
        // Initialize audio
        audioRef.current = new Audio('/dreamcatcher.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.4;
        audioRef.current.play().then(() => setAudioStarted(true)).catch(() => { });

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        import('@/lib/firebase').then(async (mod) => {
            try {
                const data = await mod.getDreams(100);
                setDreams(data);
            } catch (e) {
                console.error("Failed to load dreams", e);
            } finally {
                setLoading(false);
            }
        });
    }, []);

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const tryPlayAudio = () => {
        if (!audioStarted && audioRef.current) {
            audioRef.current.play().then(() => setAudioStarted(true)).catch(() => { });
        }
    };

    return (
        <div className={styles.dreamContainer} onClick={tryPlayAudio}>
            {/* Background Layers */}
            <div className={styles.landscapeLayer} />
            <div className={styles.foregroundHills} />
            <div className={styles.flowerField} />

            {/* Audio Control */}
            <div className={styles.audioControl} onClick={(e) => { e.stopPropagation(); toggleMute(); }}>
                {isMuted ? <VolumeX color="#fff" /> : <Volume2 color="#fff" />}
            </div>

            <div className="relative z-10 w-full min-h-screen flex flex-col p-4 md:p-8">

                <header className="flex items-center justify-between mb-6 md:mb-8 max-w-7xl mx-auto w-full">
                    <Link href="/dreamcatcher" className="text-white/60 hover:text-white flex items-center gap-2 transition-colors uppercase tracking-widest text-xs md:text-sm">
                        <ArrowLeft size={16} /> Back
                    </Link>
                    <h1 className="text-xl md:text-3xl font-light tracking-[0.2em] md:tracking-[0.3em] text-white/90 uppercase font-serif">
                        Dream Gallery
                    </h1>
                    <div className="w-8"></div>
                </header>

                <main className="flex-1 w-full max-w-7xl mx-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
                            <p className="text-white/40 tracking-widest uppercase text-sm">Loading Dreams...</p>
                        </div>
                    ) : dreams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <p className="text-white/50 tracking-widest uppercase text-sm">No dreams exhibited yet.</p>
                            <Link href="/dreamcatcher" className="mt-4 text-purple-400 hover:text-purple-300 underline text-sm">
                                Be the first dreamer
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                            {dreams.map((dream, i) => (
                                <motion.div
                                    key={dream.id || i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-black/30 backdrop-blur-sm cursor-pointer group"
                                    onClick={() => setSelectedDream(dream)}
                                >
                                    <img
                                        src={dream.imageUrl}
                                        alt={`Dream by ${dream.username}`}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                        <p className="text-white/90 text-xs md:text-sm font-medium tracking-wide truncate">{dream.username}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedDream && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
                        onClick={() => setSelectedDream(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedDream(null)}
                                className="absolute top-2 right-2 md:top-4 md:right-4 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>

                            {/* Image */}
                            <img
                                src={selectedDream.imageUrl}
                                alt={`Dream by ${selectedDream.username}`}
                                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
                            />

                            {/* Info */}
                            <div className="mt-4 text-center">
                                <p className="text-white text-lg md:text-xl font-light tracking-wide">{selectedDream.username}</p>
                                <p className="text-white/50 text-xs uppercase tracking-widest mt-1">
                                    {selectedDream.createdAt instanceof Date ? selectedDream.createdAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown Date'}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
