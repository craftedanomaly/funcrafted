"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// ============================================
// TYPES & CONSTANTS
// ============================================

interface Action {
  label: string;
  timeJump: number; // in minutes
  feedback: string;
  minEntropy?: number;
  visual?: string; // visual change trigger
}

type Era = "morning" | "day" | "evening" | "night" | "seasons" | "centuries" | "cosmic" | "end";

const ACTIONS: Action[] = [
  { label: "Organize desktop icons", timeJump: 10, feedback: "You felt productive for a second.", visual: "desk" },
  { label: "Read random wiki page", timeJump: 45, feedback: "You learned something useless.", visual: "screen" },
  { label: "Stare at wall", timeJump: 120, feedback: "The wall stared back.", visual: "wall" },
  { label: "Check phone again", timeJump: 30, feedback: "Nothing new.", visual: "phone" },
  { label: "Make another coffee", timeJump: 15, feedback: "Caffeine won't help.", visual: "coffee" },
  { label: "Scroll social media", timeJump: 90, feedback: "Everyone seems happy.", visual: "screen" },
  { label: "Watch one more video", timeJump: 60, feedback: "The algorithm knows you.", visual: "screen" },
  { label: "Worry about future", timeJump: 10080, feedback: "A week passed in anxiety.", visual: "window" },
  { label: "Contemplate existence", timeJump: 180, feedback: "No answers found.", visual: "wall" },
  { label: "Reorganize bookmarks", timeJump: 45, feedback: "Still won't read them.", visual: "screen" },
  { label: "Clean desk (partially)", timeJump: 20, feedback: "Good enough.", visual: "desk" },
  { label: "Draft email, delete it", timeJump: 25, feedback: "Maybe tomorrow.", visual: "screen" },
  { label: "Research productivity tips", timeJump: 120, feedback: "Ironic.", visual: "screen" },
  { label: "Take a power nap", timeJump: 180, feedback: "You overslept.", visual: "sleep" },
  { label: "Daydream about success", timeJump: 60, feedback: "It felt real for a moment.", visual: "window" },
  { label: "Watch seasons change", timeJump: 131400, feedback: "Months blurred together.", minEntropy: 25, visual: "window" },
  { label: "See empires rise", timeJump: 262800000, feedback: "History repeated itself.", minEntropy: 50, visual: "window" },
  { label: "Witness civilizations fall", timeJump: 525600000, feedback: "Dust to dust.", minEntropy: 65, visual: "window" },
  { label: "Count the stars dying", timeJump: 52560000000, feedback: "The universe grew cold.", minEntropy: 80, visual: "window" },
  { label: "Wait for entropy", timeJump: 999999999999, feedback: "...", minEntropy: 90, visual: "end" },
];

const PENDING_TASKS = [
  "Reply to email",
  "Start project", 
  "Call mom",
  "Pay bills",
  "Exercise",
  "Learn new skill",
  "Fix that thing",
  "Apologize to friend",
  "Book appointment",
  "Clean room",
  "Update resume",
  "Read that book",
  "Water plants",
  "Backup files",
  "Cancel subscription",
];

const EVENTS = [
  "A bird flew by",
  "The sun moved",
  "Dust settled",
  "A car passed",
  "Someone laughed outside",
  "The fridge hummed",
  "A notification... nevermind",
  "The clock ticked",
  "Shadows shifted",
  "Life continued elsewhere",
];

// ============================================
// GAME ENGINE HOOK
// ============================================

function useGameEngine() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 10, 24, 9, 0)); // Nov 24, 2025, 9:00 AM
  const [entropy, setEntropy] = useState(0);
  const [era, setEra] = useState<Era>("morning");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionsTaken, setActionsTaken] = useState(0);
  const [lastVisual, setLastVisual] = useState<string | null>(null);
  const [currentEvent, setCurrentEvent] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get available actions based on entropy
  const getAvailableActions = useCallback(() => {
    const available = ACTIONS.filter((a) => !a.minEntropy || entropy >= a.minEntropy);
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  }, [entropy]);

  const [currentActions, setCurrentActions] = useState<Action[]>([]);

  // Initialize actions
  useEffect(() => {
    setCurrentActions(getAvailableActions());
  }, []);

  // Auto-time progression - real time x20 (1 real second = 20 game minutes)
  useEffect(() => {
    if (entropy >= 95) return; // Stop at end
    
    const interval = setInterval(() => {
      // Add 20 minutes per real second (scaled by entropy for faster progression)
      const timeMultiplier = entropy >= 60 ? 100 : entropy >= 30 ? 50 : 20;
      setCurrentDate((prev) => new Date(prev.getTime() + timeMultiplier * 60 * 1000));
      
      // Random events while time passes
      if (Math.random() < 0.3) {
        setCurrentEvent(EVENTS[Math.floor(Math.random() * EVENTS.length)]);
        setTimeout(() => setCurrentEvent(null), 2000);
      }
      
      // Very slow entropy increase from auto-time
      if (Math.random() < 0.05) {
        setEntropy((prev) => Math.min(100, prev + 0.1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [entropy]);

  // Determine era based on entropy
  useEffect(() => {
    if (entropy >= 95) setEra("end");
    else if (entropy >= 80) setEra("cosmic");
    else if (entropy >= 60) setEra("centuries");
    else if (entropy >= 30) setEra("seasons");
    else {
      const hour = currentDate.getHours();
      if (hour >= 6 && hour < 12) setEra("morning");
      else if (hour >= 12 && hour < 18) setEra("day");
      else if (hour >= 18 && hour < 21) setEra("evening");
      else setEra("night");
    }
  }, [entropy, currentDate]);

  // Perform action
  const performAction = useCallback((action: Action) => {
    // Clear previous feedback timeout
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    // Update date
    setCurrentDate((prev) => {
      const newDate = new Date(prev.getTime() + action.timeJump * 60 * 1000);
      return newDate;
    });

    // Increase entropy
    const entropyGain = Math.min(5, 1 + Math.floor(action.timeJump / 1000));
    setEntropy((prev) => Math.min(100, prev + entropyGain));

    // Show feedback
    setFeedback(action.feedback);
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 3000);

    // Set visual change
    if (action.visual) {
      setLastVisual(action.visual);
      setTimeout(() => setLastVisual(null), 2000);
    }

    // Increment actions taken
    setActionsTaken((prev) => prev + 1);

    // Get new actions
    setTimeout(() => {
      setCurrentActions(getAvailableActions());
    }, 100);
  }, [getAvailableActions]);

  // Format date display
  const formatDate = useCallback(() => {
    if (entropy >= 95) return "Era: Silence";
    if (entropy >= 90) return "Year: The End";
    if (entropy >= 80) {
      const years = Math.floor((currentDate.getTime() - new Date(2025, 0, 1).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (years > 1000000) return `Year: ${(years / 1000000).toFixed(1)}M`;
      if (years > 1000) return `Year: ${Math.floor(years / 1000)}K`;
      return `Year: ${2025 + years}`;
    }
    if (entropy >= 60) {
      const years = Math.floor((currentDate.getTime() - new Date(2025, 0, 1).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return `Year: ${2025 + years}`;
    }
    return currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [currentDate, entropy]);

  // Format time display
  const formatTime = useCallback(() => {
    if (entropy >= 90) return "∞";
    if (entropy >= 80) return "—";
    if (entropy >= 60) return "···";
    return currentDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  }, [currentDate, entropy]);

  return {
    currentDate,
    entropy,
    era,
    feedback,
    actionsTaken,
    currentActions,
    performAction,
    formatDate,
    formatTime,
    lastVisual,
    currentEvent,
  };
}

// ============================================
// COMPONENTS
// ============================================

// Animated Character
function Character() {
  return (
    <div className="absolute bottom-[30%] left-1/2 -translate-x-1/2 z-10">
      {/* Chair */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-6 bg-[#8B7355] rounded-sm" />
      
      {/* Body */}
      <motion.div
        animate={{ scaleY: [1, 1.02, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        {/* Torso */}
        <div className="w-6 h-8 bg-[#6B8E7B] rounded-t-lg mx-auto" />
        
        {/* Head */}
        <motion.div
          className="w-5 h-5 bg-[#E8D5C4] rounded-full mx-auto -mt-1 relative"
        >
          {/* Eyes */}
          <motion.div
            animate={{ scaleY: [1, 0.1, 1] }}
            transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 3 }}
            className="absolute top-2 left-1 w-1 h-1 bg-[#333] rounded-full"
          />
          <motion.div
            animate={{ scaleY: [1, 0.1, 1] }}
            transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 3 }}
            className="absolute top-2 right-1 w-1 h-1 bg-[#333] rounded-full"
          />
        </motion.div>
        
        {/* Arms on desk */}
        <div className="absolute top-6 -left-2 w-2 h-4 bg-[#6B8E7B] rounded-full rotate-45" />
        <div className="absolute top-6 -right-2 w-2 h-4 bg-[#6B8E7B] rounded-full -rotate-45" />
      </motion.div>
    </div>
  );
}

// Window with dynamic background
function Window({ era, entropy }: { era: Era; entropy: number }) {
  const getWindowContent = () => {
    switch (era) {
      case "morning":
        return (
          <div className="w-full h-full bg-gradient-to-b from-[#87CEEB] to-[#E0F4FF] relative overflow-hidden">
            {/* Sun */}
            <motion.div
              animate={{ x: [0, 10, 0] }}
              transition={{ duration: 20, repeat: Infinity }}
              className="absolute top-3 right-4 w-6 h-6 bg-[#FFE066] rounded-full shadow-lg"
              style={{ boxShadow: "0 0 20px #FFE066" }}
            />
            {/* Clouds */}
            <motion.div
              animate={{ x: [-20, 60] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute top-4 left-0 w-8 h-3 bg-white/80 rounded-full"
            />
            <motion.div
              animate={{ x: [-30, 60] }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 5 }}
              className="absolute top-8 left-0 w-6 h-2 bg-white/60 rounded-full"
            />
          </div>
        );
      case "day":
        return (
          <div className="w-full h-full bg-gradient-to-b from-[#5DA5DA] to-[#87CEEB] relative overflow-hidden">
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 15, repeat: Infinity }}
              className="absolute top-2 right-6 w-8 h-8 bg-[#FFF176] rounded-full"
              style={{ boxShadow: "0 0 30px #FFF176" }}
            />
          </div>
        );
      case "evening":
        return (
          <div className="w-full h-full bg-gradient-to-b from-[#FF7E5F] via-[#FEB47B] to-[#7B68EE] relative overflow-hidden">
            <div className="absolute bottom-0 w-full h-4 bg-[#2D1B4E]/50" />
          </div>
        );
      case "night":
        return (
          <div className="w-full h-full bg-gradient-to-b from-[#0D1B2A] to-[#1B263B] relative overflow-hidden">
            {/* Stars */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{ top: `${10 + (i * 7) % 50}%`, left: `${10 + (i * 13) % 80}%` }}
              />
            ))}
            <div className="absolute top-2 right-3 w-5 h-5 bg-[#F5F5DC] rounded-full shadow-lg" />
          </div>
        );
      case "seasons":
        return (
          <motion.div
            animate={{ backgroundColor: ["#87CEEB", "#FFB347", "#8B4513", "#E8E8E8", "#87CEEB"] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="w-full h-full relative overflow-hidden"
          >
            {/* Rapid day/night */}
            <motion.div
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1B263B]/50"
            />
            {/* Buildings rising */}
            <motion.div
              animate={{ height: ["20%", "60%", "40%"] }}
              transition={{ duration: 10, repeat: Infinity }}
              className="absolute bottom-0 left-2 w-3 bg-[#4A4A4A]"
            />
            <motion.div
              animate={{ height: ["30%", "50%", "70%"] }}
              transition={{ duration: 12, repeat: Infinity, delay: 2 }}
              className="absolute bottom-0 right-4 w-4 bg-[#5A5A5A]"
            />
          </motion.div>
        );
      case "centuries":
        return (
          <motion.div
            animate={{ backgroundColor: ["#4A4A4A", "#2D1B4E", "#8B0000", "#1A1A1A"] }}
            transition={{ duration: 15, repeat: Infinity }}
            className="w-full h-full relative overflow-hidden"
          >
            {/* Futuristic then ruins */}
            <motion.div
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 15, repeat: Infinity }}
              className="absolute bottom-0 w-full"
            >
              <div className="flex justify-around">
                <div className="w-2 h-12 bg-[#00CED1]/50" />
                <div className="w-3 h-16 bg-[#00CED1]/30" />
                <div className="w-2 h-10 bg-[#00CED1]/40" />
              </div>
            </motion.div>
            {/* Red sky */}
            <motion.div
              animate={{ opacity: [0, 0, 0.5, 0.8] }}
              transition={{ duration: 15, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-b from-[#8B0000]/50 to-transparent"
            />
          </motion.div>
        );
      case "cosmic":
        return (
          <div className="w-full h-full bg-[#0A0A0A] relative overflow-hidden">
            {/* Dying stars */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.8, 0.1, 0], scale: [1, 0.5, 0] }}
                transition={{ duration: 10, repeat: Infinity, delay: i * 2 }}
                className="absolute w-2 h-2 bg-[#FF4500] rounded-full"
                style={{ top: `${20 + i * 15}%`, left: `${15 + i * 18}%` }}
              />
            ))}
          </div>
        );
      case "end":
        return (
          <motion.div
            animate={{ opacity: [1, 0.95, 1] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="w-full h-full bg-[#000000] relative overflow-hidden"
          >
            {/* Static noise */}
            <div 
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
          </motion.div>
        );
    }
  };

  return (
    <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-16 h-12 border-4 border-[#8B7355] bg-[#D4C4B0] overflow-hidden rounded-sm shadow-inner">
      {getWindowContent()}
    </div>
  );
}

// Isometric Room
function IsometricRoom({ era, entropy }: { era: Era; entropy: number }) {
  return (
    <div 
      className="relative w-72 h-72 mx-auto"
      style={{
        transform: "rotateX(60deg) rotateZ(-45deg)",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Floor */}
      <div 
        className="absolute w-full h-full bg-[#C4B8A5]"
        style={{
          transform: "translateZ(0px)",
          boxShadow: "inset 0 0 50px rgba(0,0,0,0.1)",
        }}
      />
      
      {/* Back Wall */}
      <div 
        className="absolute w-full bg-[#E8DFD0] origin-bottom"
        style={{
          height: "200px",
          transform: "rotateX(-90deg) translateZ(0px)",
        }}
      >
        {/* Window on back wall */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-20 h-16 border-4 border-[#8B7355] bg-[#87CEEB] rounded-sm overflow-hidden">
          <Window era={era} entropy={entropy} />
        </div>
      </div>
      
      {/* Left Wall */}
      <div 
        className="absolute h-full bg-[#D9CFC0] origin-left"
        style={{
          width: "200px",
          transform: "rotateY(90deg) translateZ(0px)",
        }}
      />
      
      {/* Desk */}
      <div 
        className="absolute bg-[#A0522D] rounded-sm"
        style={{
          width: "80px",
          height: "40px",
          bottom: "40%",
          left: "50%",
          transform: "translateX(-50%) translateZ(30px)",
          boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
        }}
      >
        {/* Monitor */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-10 h-8 bg-[#2A2A2A] rounded-sm border-2 border-[#1A1A1A]">
          <motion.div
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-full h-full bg-[#1E3A5F] rounded-sm"
          />
        </div>
      </div>
    </div>
  );
}

// Side Tasks - Left and Right columns
function SideTasks({ side }: { side: "left" | "right" }) {
  const tasks = side === "left" 
    ? PENDING_TASKS.slice(0, 8) 
    : PENDING_TASKS.slice(7, 15);
  
  return (
    <div className={`absolute top-32 ${side === "left" ? "left-4" : "right-4"} w-40 pointer-events-none`}>
      <div className="text-xs text-[#505050] font-mono mb-2 uppercase tracking-wider">
        {side === "left" ? "Should do:" : "Also pending:"}
      </div>
      <div className="space-y-1">
        {tasks.map((task, i) => (
          <motion.div
            key={task}
            initial={{ opacity: 0, x: side === "left" ? -20 : 20 }}
            animate={{ opacity: 0.4, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="text-xs text-[#606060] font-mono truncate"
          >
            • {task}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Floating Events - more visible, random positions
function FloatingEvents({ currentEvent }: { currentEvent: string | null }) {
  const [events, setEvents] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const eventIdRef = useRef(0);

  useEffect(() => {
    if (currentEvent) {
      const newEvent = {
        id: eventIdRef.current++,
        text: currentEvent,
        x: 20 + Math.random() * 60,
        y: 30 + Math.random() * 40,
      };
      setEvents((prev) => [...prev.slice(-4), newEvent]);
    }
  }, [currentEvent]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="absolute text-sm text-[#8B8B8B] font-mono italic"
            style={{ left: `${event.x}%`, top: `${event.y}%` }}
          >
            {event.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function ProcrastinationSimulatorPage() {
  const {
    entropy,
    era,
    feedback,
    actionsTaken,
    currentActions,
    performAction,
    formatDate,
    formatTime,
    lastVisual,
    currentEvent,
  } = useGameEngine();

  return (
    <div className="flex min-h-screen flex-col bg-[#1A1A1A]">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Date Display - Top Left */}
        <div className="absolute top-20 left-6 z-20">
          <motion.div
            key={formatDate()}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-lg text-[#A0A0A0]"
          >
            {formatDate()}
          </motion.div>
        </div>

        {/* Clock Display - Top Right */}
        <div className="absolute top-20 right-6 z-20">
          <motion.div
            key={formatTime()}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-lg text-[#A0A0A0]"
          >
            {formatTime()}
          </motion.div>
        </div>

        {/* Entropy Bar */}
        <div className="absolute top-28 left-6 right-6 z-20">
          <div className="h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${entropy}%` }}
              className="h-full bg-gradient-to-r from-[#6B8E7B] via-[#FFB347] to-[#8B0000]"
            />
          </div>
          <div className="text-xs text-[#606060] mt-1 font-mono">
            Entropy: {entropy}%
          </div>
        </div>

        {/* The Room */}
        <div className="relative mb-8">
          {/* Simple 2D Room View */}
          <div className="relative w-80 h-64 bg-[#E8DFD0] rounded-lg overflow-hidden border-4 border-[#8B7355] shadow-2xl">
            {/* Back wall texture */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#E8DFD0] to-[#D9CFC0]" />
            
            {/* Window */}
            <Window era={era} entropy={entropy} />
            
            {/* Floor */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#C4B8A5]" />
            
            {/* Desk */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-24 h-8 bg-[#A0522D] rounded-t-sm shadow-lg">
              {/* Monitor */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-14 h-10 bg-[#2A2A2A] rounded-sm border-2 border-[#1A1A1A]">
                <motion.div
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-full h-full bg-gradient-to-br from-[#1E3A5F] to-[#0D1B2A] rounded-sm flex items-center justify-center"
                >
                  <div className="w-2 h-2 bg-[#00FF00]/30 rounded-full" />
                </motion.div>
              </div>
              {/* Monitor Stand */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1A1A1A]" />
            </div>
            
            {/* Character */}
            <Character />
            
            {/* Feedback Text */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-[60%] left-1/2 -translate-x-1/2 text-xs text-[#6B8E7B] font-mono text-center whitespace-nowrap bg-[#E8DFD0]/80 px-2 py-1 rounded"
                >
                  {feedback}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Side Tasks - Left and Right */}
        <SideTasks side="left" />
        <SideTasks side="right" />
        
        {/* Floating Events */}
        <FloatingEvents currentEvent={currentEvent} />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 max-w-md w-full px-4">
          {currentActions.map((action, i) => (
            <motion.button
              key={`${action.label}-${i}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02, backgroundColor: "rgba(107, 142, 123, 0.2)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => performAction(action)}
              className="px-4 py-3 text-sm text-[#A0A0A0] hover:text-white font-mono border border-[#3A3A3A] rounded-lg bg-[#2A2A2A]/50 transition-colors text-left"
            >
              {action.label}
            </motion.button>
          ))}
        </div>

        {/* Actions Counter */}
        <div className="mt-6 text-xs text-[#404040] font-mono">
          Actions taken: {actionsTaken}
        </div>

        {/* Back Button */}
        <Link
          href="/"
          className="absolute bottom-6 left-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </main>

      <Footer />
    </div>
  );
}
