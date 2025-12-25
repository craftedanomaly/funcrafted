'use client';

import React, { useEffect, useState } from 'react';
import styles from '../dream.module.css';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { DreamEntry } from '@/lib/firebase';

export default function GalleryPage() {
    const [dreams, setDreams] = useState<DreamEntry[]>([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className={styles.dreamContainer}>
            {/* Background Layers */}
            <div className={styles.landscapeLayer} />
            <div className={styles.foregroundHills} />
            <div className={styles.flowerField} />

            <div className="relative z-10 w-full min-h-screen flex flex-col p-4 md:p-8">

                <header className="flex items-center justify-between mb-8 max-w-7xl mx-auto w-full">
                    <Link href="/dreamcatcher" className="text-white/60 hover:text-white flex items-center gap-2 transition-colors uppercase tracking-widest text-sm">
                        <ArrowLeft size={16} /> Back to Dreamcatcher
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-light tracking-[0.3em] text-white/90 uppercase font-serif">
                        Dream Gallery
                    </h1>
                    <div className="w-8"></div> {/* Spacer */}
                </header>

                <main className="flex-1 w-full max-w-7xl mx-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
                            <p className="text-white/40 tracking-widest uppercase text-sm">Loading Dreams...</p>
                        </div>
                    ) : (
                        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                            {dreams.map((dream, i) => (
                                <motion.div
                                    key={dream.id || i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="break-inside-avoid relative group rounded-lg overflow-hidden border border-white/10 bg-black/20 backdrop-blur-sm"
                                >
                                    <img
                                        src={dream.imageUrl}
                                        alt={`Dream by ${dream.username}`}
                                        className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <p className="text-white/90 font-medium tracking-wide">{dream.username}</p>
                                        <p className="text-white/50 text-xs uppercase tracking-widest mt-1">
                                            {dream.createdAt instanceof Date ? dream.createdAt.toLocaleDateString() : 'Unknown Date'}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </main>

            </div>
        </div>
    );
}
