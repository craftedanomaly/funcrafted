'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './dream.module.css';
import { Camera, Upload, Sparkles, Loader2, Volume2, VolumeX, ArrowRight, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

type Step = 'LANDING' | 'CAMERA' | 'PROMPT' | 'LOADING' | 'RESULT';

export default function DreamcatcherPage() {
    const [step, setStep] = useState<Step>('LANDING');
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [dreamPrompt, setDreamPrompt] = useState('');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Audio state
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [audioStarted, setAudioStarted] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);

        // Initialize audio
        audioRef.current = new Audio('/dreamcatcher.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.4; // Subtle volume

        return () => {
            window.removeEventListener('resize', checkMobile);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const tryPlayAudio = () => {
        if (!audioStarted && audioRef.current) {
            audioRef.current.play().then(() => {
                setAudioStarted(true);
            }).catch(e => {
                console.log("Audio autoplay prevented, waiting for interaction", e);
            });
        }
    };

    const handleStart = () => {
        tryPlayAudio();
        setStep('CAMERA');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setImageSrc(ev.target?.result as string);
                setStep('PROMPT');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSkip = () => {
        setImageSrc(null);
        setStep('PROMPT');
    };

    const handleGenerate = async () => {
        if (!dreamPrompt) return;
        setStep('LOADING');
        setError(null);

        try {
            const base64Data = imageSrc ? imageSrc.split(',')[1] : null;

            const response = await fetch('/api/dreamcatcher/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: base64Data,
                    prompt: dreamPrompt,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to materialize dream');
            }

            const data = await response.json();
            if (data.image) {
                setResultImage(`data:image/png;base64,${data.image}`);
                setStep('RESULT');
            } else {
                throw new Error('No dream image returned');
            }
        } catch (err: any) {
            const msg = err.message || 'Something went wrong in the dream realm.';
            setError(msg);

            // If strict rate limit, maybe we don't return to PROMPT step?
            // "The UI should look mysterious but final. No retry button, no bypass option."
            if (msg.includes("How many dreams")) {
                setStep('LANDING'); // Reset or something? 
                // Actually user said "display it to the user in a Toast notification or a clean Modal".
                // And "No retry button".
                // I'll keep the error state visible in the prompt screen or create a new 'LIMIT_REACHED' step?
                // A toast/modal approach implies overlay.
                // Let's create a blocking modal state if this error occurs.
            } else {
                setStep('PROMPT');
            }
        }
    };

    const reset = () => {
        setImageSrc(null);
        setDreamPrompt('');
        setResultImage(null);
        setStep('LANDING');
        setError(null);
    };

    return (
        <div className={styles.dreamContainer} onClick={tryPlayAudio}> {/* Backup interaction for audio */}
            {/* Background Landscape */}
            <div className={styles.landscapeLayer} />
            <div className={styles.foregroundHills} />
            <div className={styles.flowerField} />

            {/* Audio Control */}
            <div className={styles.audioControl} onClick={(e) => { e.stopPropagation(); toggleMute(); }}>
                {isMuted ? <VolumeX color="#fff" /> : <Volume2 color="#fff" />}
            </div>

            {step !== 'RESULT' && (
                <h1 className={styles.mainTitle}>CATCH YOUR DREAM</h1>
            )}

            {/* Rate Limit Modal */}
            {error && error.includes("How many dreams") && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="max-w-md p-8 text-center border border-white/10 rounded-2xl bg-white/5 shadow-2xl">
                        <h3 className="text-2xl text-purple-300 font-light mb-4 font-serif">Destiny Paused</h3>
                        <p className="text-white/80 text-lg leading-relaxed tracking-wide">
                            {error}
                        </p>
                        <div className="mt-8 w-24 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent mx-auto opacity-50" />
                    </div>
                </div>
            )}

            <main className="relative z-10 w-full flex flex-col items-center justify-center p-4">
                <AnimatePresence mode="wait">

                    {step === 'LANDING' && (
                        <motion.div
                            key="sphere"
                            layoutId="morph-container"
                            className={`${styles.sphere} ${styles.sphereAnimate}`}
                            onClick={(e) => { e.stopPropagation(); handleStart(); }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
                        >
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-white/80 text-center font-light text-sm px-4 tracking-widest uppercase"
                            >
                                Begin
                            </motion.span>
                        </motion.div>
                    )}

                    {step === 'CAMERA' && (
                        <motion.div
                            key="camera"
                            layoutId="morph-container"
                            className={styles.expandedCard}
                            initial={{ borderRadius: '100px', width: '140px', height: '140px', opacity: 0.5 }}
                            animate={{ borderRadius: '30px', width: '90vw', height: 'auto', opacity: 1, maxWidth: '500px' }}
                            transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
                        >
                            <h2 className="text-xl mb-6 text-white/90 font-light tracking-wide text-center">
                                {isMobile ? "Take a selfie" : "Upload your photo"}
                            </h2>

                            <div className="flex flex-col gap-4 w-full items-center">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={styles.button}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Upload size={16} /> {isMobile ? "Camera" : "Select Photo"}
                                    </div>
                                </button>
                                <button
                                    onClick={handleSkip}
                                    className={`${styles.button} ${styles.secondary}`}
                                >
                                    Skip
                                </button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="user"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        </motion.div>
                    )}

                    {step === 'PROMPT' && (
                        <motion.div
                            key="prompt"
                            layoutId="morph-container"
                            className={styles.expandedCard}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h2 className="text-xl mb-4 text-white/90 font-light tracking-wide">Describe the Dream</h2>

                            {imageSrc && (
                                <div className="mb-4 rounded-full overflow-hidden w-20 h-20 border border-white/20 shadow-lg relative mx-auto">
                                    <Image
                                        src={imageSrc}
                                        alt="Uploaded"
                                        fill
                                        className="object-cover opacity-80"
                                    />
                                </div>
                            )}

                            <textarea
                                className={styles.textarea}
                                rows={4}
                                placeholder="I was floating through a neon-lit ancient library..."
                                value={dreamPrompt}
                                onChange={(e) => setDreamPrompt(e.target.value)}
                            />

                            {error && <p className="text-red-400 text-sm mb-4 bg-red-900/10 px-2 py-1 rounded">{error}</p>}

                            <button
                                onClick={handleGenerate}
                                disabled={!dreamPrompt}
                                className={styles.button}
                            >
                                Catch your dream
                            </button>
                        </motion.div>
                    )}

                    {step === 'LOADING' && (
                        <motion.div
                            key="loading"
                            className="flex flex-col items-center justify-center p-8"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
                                <Loader2 className="w-12 h-12 animate-spin text-white/70 relative z-10" />
                            </div>
                            <p className="text-lg text-white/60 font-light tracking-[0.2em] mt-6 animate-pulse">CATCHING YOUR DREAM...</p>
                        </motion.div>
                    )}

                    {step === 'RESULT' && resultImage && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="flex flex-col items-center w-full"
                        >
                            <div className="relative w-full max-w-4xl shadow-2xl rounded-sm overflow-hidden flex justify-center group">
                                {/* Manually sizing img for aesthetic control */}
                                <img
                                    src={resultImage}
                                    alt="Dream Comic"
                                    className={styles.resultImage}
                                />
                                <a
                                    href={resultImage}
                                    download="dreamcatcher_comic.png"
                                    className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md border border-white/20 transition-all transform hover:scale-110 shadow-lg z-50"
                                    title="Download Comic"
                                >
                                    <Download size={24} />
                                </a>
                            </div>

                            <div className={styles.footerLink}>
                                <p className={styles.footerText}>Wanna see a movie like this?</p>
                                <a
                                    href="https://ozgurcanuzunyasa.com/wildones"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${styles.button} inline-flex items-center gap-2 mt-2 border-white/20 hover:border-white/50`}
                                >
                                    Explore <ArrowRight size={14} />
                                </a>

                                <div className="mt-8">
                                    <button onClick={reset} className="text-white/40 hover:text-white/80 transition-colors text-xs tracking-widest uppercase">
                                        Dream Again
                                    </button>
                                </div>

                                <div className="mt-8 w-full max-w-md">
                                    <ExhibitSection image={resultImage} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

function ExhibitSection({ image }: { image: string }) {
    const [isExhibiting, setIsExhibiting] = useState(false);
    const [username, setUsername] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleExhibit = async () => {
        if (!username.trim()) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/dreamcatcher/exhibit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image, username })
            });
            if (res.ok) {
                router.push('/dreamcatcher/gallery');
            } else {
                alert("Failed to exhibit. Try again.");
                setIsSubmitting(false);
            }
        } catch (e) {
            console.error(e);
            setIsSubmitting(false);
        }
    };

    if (isExhibiting) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 bg-white/5 p-6 rounded-2xl border border-white/10"
            >
                <h3 className="text-white/80 text-sm tracking-wide text-center uppercase">Join the Dream Wall</h3>
                <input
                    type="text"
                    placeholder="Your Name / Dreamer Name"
                    className={styles.input}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={20}
                />
                <button
                    onClick={handleExhibit}
                    disabled={isSubmitting || !username.trim()}
                    className={`${styles.button} w-full py-3 text-sm`}
                >
                    {isSubmitting ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : "Exhibit Dream"}
                </button>
            </motion.div>
        )
    }

    return (
        <button
            onClick={() => setIsExhibiting(true)}
            className="w-full py-4 border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 rounded-xl transition-all uppercase tracking-[0.2em] font-light text-sm shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]"
        >
            Exhibit Your Dream
        </button>
    )
}

