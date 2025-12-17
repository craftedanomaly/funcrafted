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
  feedback: string;
  visual?: string;
}

interface Task {
  id: number;
  name: string;
  deadline: number; // day number
  failed: boolean;
  consequence: string;
}

type Era = "morning" | "day" | "evening" | "night" | "late";

const ACTIONS: Action[] = [
  { label: "Organize desktop icons", feedback: "You felt productive for a second.", visual: "desk" },
  { label: "Read random wiki page", feedback: "You learned something useless.", visual: "screen" },
  { label: "Stare at wall", feedback: "The wall stared back.", visual: "wall" },
  { label: "Check phone again", feedback: "Nothing new.", visual: "phone" },
  { label: "Make another coffee", feedback: "Caffeine won't help.", visual: "coffee" },
  { label: "Scroll social media", feedback: "Everyone seems happy.", visual: "screen" },
  { label: "Watch one more video", feedback: "The algorithm knows you.", visual: "screen" },
  { label: "Contemplate existence", feedback: "No answers found.", visual: "wall" },
  { label: "Reorganize bookmarks", feedback: "Still won't read them.", visual: "screen" },
  { label: "Clean desk (partially)", feedback: "Good enough.", visual: "desk" },
  { label: "Draft email, delete it", feedback: "Maybe tomorrow.", visual: "screen" },
  { label: "Research productivity tips", feedback: "Ironic.", visual: "screen" },
  { label: "Take a power nap", feedback: "You overslept.", visual: "sleep" },
  { label: "Daydream about success", feedback: "It felt real for a moment.", visual: "window" },
  { label: "Watch another episode", feedback: "Just one more...", visual: "screen" },
  { label: "Browse online shopping", feedback: "Added to cart. Won't buy.", visual: "screen" },
  { label: "Check fridge again", feedback: "Still empty.", visual: "coffee" },
  { label: "Rearrange furniture mentally", feedback: "Too much effort.", visual: "wall" },
];

const TASK_TEMPLATES = [
  { name: "Reply to boss's email", deadlineDays: 2, consequence: "You got fired." },
  { name: "Pay rent", deadlineDays: 5, consequence: "You got evicted." },
  { name: "Call mom back", deadlineDays: 3, consequence: "Mom is disappointed." },
  { name: "Submit project", deadlineDays: 7, consequence: "Client cancelled contract." },
  { name: "Doctor appointment", deadlineDays: 4, consequence: "Health declined." },
  { name: "Reply to friend", deadlineDays: 6, consequence: "Friend stopped texting." },
  { name: "Pay electricity bill", deadlineDays: 8, consequence: "Power got cut off." },
  { name: "Finish presentation", deadlineDays: 3, consequence: "Meeting was a disaster." },
  { name: "Text back crush", deadlineDays: 2, consequence: "They moved on." },
  { name: "Renew subscription", deadlineDays: 5, consequence: "Lost all your data." },
  { name: "Water the plants", deadlineDays: 4, consequence: "Plants died." },
  { name: "Feed the cat", deadlineDays: 1, consequence: "Cat is angry at you." },
  { name: "Return package", deadlineDays: 6, consequence: "Lost $50 refund." },
  { name: "Schedule dentist", deadlineDays: 10, consequence: "Tooth got worse." },
  { name: "Reply to landlord", deadlineDays: 3, consequence: "Lease not renewed." },
];

const RANDOM_EVENTS = [
  "A bird flew by the window.",
  "The sun moved across the sky.",
  "Dust settled on the keyboard.",
  "A car honked outside.",
  "Someone laughed in the distance.",
  "The fridge hummed louder.",
  "A notification... just spam.",
  "The clock ticked mockingly.",
  "Shadows grew longer.",
  "Life continued without you.",
  "Your phone buzzed. Wrong number.",
  "A fly landed on the screen.",
  "The neighbor's dog barked.",
  "Wind rattled the window.",
  "Your stomach growled.",
  "The chair creaked.",
  "A siren passed by.",
  "The AC kicked in.",
  "Someone walked past your door.",
  "The screen dimmed briefly.",
];

// ============================================
// GAME ENGINE HOOK
// ============================================

function useGameEngine() {
  const [day, setDay] = useState(1);
  const [era, setEra] = useState<Era>("morning");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionsTaken, setActionsTaken] = useState(0);
  const [lastVisual, setLastVisual] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLog, setTaskLog] = useState<string[]>(["[Day 1] You woke up with things to do."]);
  const [eventLog, setEventLog] = useState<string[]>(["[System] Simulation started."]);
  const [consequences, setConsequences] = useState<string[]>([]);
  const taskIdRef = useRef(0);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get random actions
  const getAvailableActions = useCallback(() => {
    const shuffled = [...ACTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  }, []);

  const [currentActions, setCurrentActions] = useState<Action[]>([]);

  // Initialize
  useEffect(() => {
    setCurrentActions(getAvailableActions());
    // Add initial tasks
    const initialTasks = TASK_TEMPLATES.slice(0, 3).map((t, i) => ({
      id: taskIdRef.current++,
      name: t.name,
      deadline: day + t.deadlineDays,
      failed: false,
      consequence: t.consequence,
    }));
    setTasks(initialTasks);
    initialTasks.forEach(t => {
      setTaskLog(prev => [...prev, `[Day ${day}] NEW: "${t.name}" - Due: Day ${t.deadline}`]);
    });
  }, []);

  // Auto day progression - 1 day per 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setDay(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Random events every few seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
      setEventLog(prev => [...prev.slice(-19), `[Day ${day}] ${event}`]);
    }, 3000);

    return () => clearInterval(interval);
  }, [day]);

  // Check deadlines when day changes
  useEffect(() => {
    // Check for failed tasks
    setTasks(prev => {
      const updated = prev.map(task => {
        if (!task.failed && day > task.deadline) {
          // Task failed!
          setTaskLog(log => [...log, `[Day ${day}] FAILED: "${task.name}"`]);
          setConsequences(c => [...c, task.consequence]);
          setEventLog(log => [...log, `[Day ${day}] ⚠️ ${task.consequence}`]);
          return { ...task, failed: true };
        }
        return task;
      });
      return updated;
    });

    // Maybe add a new task
    if (day > 1 && Math.random() < 0.3) {
      const availableTemplates = TASK_TEMPLATES.filter(
        t => !tasks.some(existing => existing.name === t.name && !existing.failed)
      );
      if (availableTemplates.length > 0) {
        const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
        const newTask: Task = {
          id: taskIdRef.current++,
          name: template.name,
          deadline: day + template.deadlineDays,
          failed: false,
          consequence: template.consequence,
        };
        setTasks(prev => [...prev, newTask]);
        setTaskLog(prev => [...prev, `[Day ${day}] NEW: "${newTask.name}" - Due: Day ${newTask.deadline}`]);
      }
    }

    // Update era based on day
    if (day >= 30) setEra("late");
    else if (day >= 20) setEra("night");
    else if (day >= 10) setEra("evening");
    else if (day >= 5) setEra("day");
    else setEra("morning");
  }, [day]);

  // Perform action - advances 1 day
  const performAction = useCallback((action: Action) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    // Advance 1 day
    setDay(prev => prev + 1);

    // Show feedback
    setFeedback(action.feedback);
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 3000);

    // Add to event log
    setEventLog(prev => [...prev.slice(-19), `[Day ${day}] ${action.feedback}`]);

    // Set visual change
    if (action.visual) {
      setLastVisual(action.visual);
      setTimeout(() => setLastVisual(null), 2000);
    }

    // Increment actions taken
    setActionsTaken(prev => prev + 1);

    // Get new actions
    setTimeout(() => {
      setCurrentActions(getAvailableActions());
    }, 100);
  }, [day, getAvailableActions]);

  // Get active tasks (not failed)
  const activeTasks = tasks.filter(t => !t.failed);
  const failedCount = tasks.filter(t => t.failed).length;

  return {
    day,
    era,
    feedback,
    actionsTaken,
    currentActions,
    performAction,
    lastVisual,
    taskLog,
    eventLog,
    activeTasks,
    failedCount,
    consequences,
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

// Window with dynamic background based on era
function Window({ era }: { era: Era }) {
  const getWindowContent = () => {
    switch (era) {
      case "morning":
        return (
          <div className="w-full h-full bg-gradient-to-b from-[#87CEEB] to-[#E0F4FF] relative overflow-hidden">
            <motion.div
              animate={{ x: [0, 10, 0] }}
              transition={{ duration: 20, repeat: Infinity }}
              className="absolute top-3 right-4 w-6 h-6 bg-[#FFE066] rounded-full"
              style={{ boxShadow: "0 0 20px #FFE066" }}
            />
          </div>
        );
      case "day":
        return (
          <div className="w-full h-full bg-gradient-to-b from-[#5DA5DA] to-[#87CEEB] relative overflow-hidden">
            <div className="absolute top-2 right-6 w-8 h-8 bg-[#FFF176] rounded-full" style={{ boxShadow: "0 0 30px #FFF176" }} />
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
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{ top: `${10 + (i * 12) % 60}%`, left: `${10 + (i * 15) % 80}%` }}
              />
            ))}
            <div className="absolute top-2 right-3 w-5 h-5 bg-[#F5F5DC] rounded-full" />
          </div>
        );
      case "late":
        return (
          <div className="w-full h-full bg-[#0A0A0A] relative overflow-hidden">
            <motion.div
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-[#8B0000]/20"
            />
          </div>
        );
    }
  };

  return (
    <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-16 h-12 border-4 border-[#8B7355] bg-[#D4C4B0] overflow-hidden rounded-sm shadow-inner">
      {getWindowContent()}
    </div>
  );
}

// Command Line Panel Component with mixed colors for task log
function CommandLinePanel({ 
  title, 
  logs, 
  color = "green",
  isTaskLog = false
}: { 
  title: string; 
  logs: string[]; 
  color?: "green" | "amber" | "red";
  isTaskLog?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const colorClasses = {
    green: "text-green-500 border-green-900/50",
    amber: "text-amber-500 border-amber-900/50",
    red: "text-red-500 border-red-900/50",
  };

  const getLogColor = (log: string) => {
    if (!isTaskLog) return colorClasses[color];
    if (log.includes("FAILED") || log.includes("⚠️")) return "text-red-500";
    return "text-green-500";
  };

  return (
    <div className={`w-64 h-80 bg-[#0a0a0a] border ${colorClasses[color]} rounded font-mono text-xs overflow-hidden flex flex-col`}>
      <div className={`px-2 py-1 border-b ${colorClasses[color]} bg-[#111] flex items-center gap-2`}>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/60" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
          <div className="w-2 h-2 rounded-full bg-green-500/60" />
        </div>
        <span className={colorClasses[color]}>{title}</span>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800"
      >
        {logs.map((log, i) => (
          <motion.div
            key={`${log}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${getLogColor(log)} opacity-80 mb-1 leading-tight`}
          >
            {log}
          </motion.div>
        ))}
        <span className={`${colorClasses[color]} animate-pulse`}>▌</span>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function ProcrastinationSimulatorPage() {
  const {
    day,
    era,
    feedback,
    actionsTaken,
    currentActions,
    performAction,
    lastVisual,
    taskLog,
    eventLog,
    activeTasks,
    failedCount,
  } = useGameEngine();

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <Header />

      <main className="flex flex-1 items-center justify-center p-4 gap-6">
        {/* Left Panel - Task Log */}
        <CommandLinePanel 
          title="tasks.log" 
          logs={taskLog} 
          color="green"
          isTaskLog={true}
        />

        {/* Center - Room and Controls */}
        <div className="flex flex-col items-center">
          {/* Day Counter */}
          <motion.div
            key={day}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-mono text-2xl text-[#A0A0A0] mb-4"
          >
            Day {day}
          </motion.div>

          {/* Active Tasks Summary */}
          <div className="mb-4 text-center">
            <div className="text-xs text-amber-500/80 font-mono">
              {activeTasks.length} pending task{activeTasks.length !== 1 ? "s" : ""}
              {failedCount > 0 && (
                <span className="text-red-500 ml-2">• {failedCount} failed</span>
              )}
            </div>
            {activeTasks.length > 0 && (
              <div className="text-[10px] text-amber-600/60 font-mono mt-1">
                Next deadline: Day {Math.min(...activeTasks.map(t => t.deadline))}
              </div>
            )}
          </div>

          {/* The Room */}
          <div className="relative mb-6">
            <div className="relative w-72 h-56 bg-[#E8DFD0] rounded-lg overflow-hidden border-4 border-[#8B7355] shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-b from-[#E8DFD0] to-[#D9CFC0]" />
              
              <Window era={era} />
              
              <div className="absolute bottom-0 left-0 right-0 h-14 bg-[#C4B8A5]" />
              
              {/* Coffee Cup */}
              <AnimatePresence>
                {lastVisual === "coffee" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-12 right-14 w-4 h-5"
                  >
                    <div className="w-full h-full bg-[#F5F5DC] rounded-b-sm border border-[#8B7355]" />
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1 bg-[#6B4423] rounded-t-sm" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Phone */}
              <AnimatePresence>
                {lastVisual === "phone" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-12 left-14 w-3 h-5 bg-[#2A2A2A] rounded-sm"
                  >
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 0.5, repeat: 4 }}
                      className="w-full h-full bg-[#4A90D9]/30 rounded-sm"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Desk */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#A0522D] rounded-t-sm shadow-lg">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-12 h-8 bg-[#2A2A2A] rounded-sm border-2 border-[#1A1A1A]">
                  <motion.div
                    animate={{ 
                      opacity: lastVisual === "screen" ? [0.9, 1, 0.9] : [0.7, 1, 0.7],
                    }}
                    transition={{ duration: lastVisual === "screen" ? 0.5 : 3, repeat: Infinity }}
                    className="w-full h-full bg-[#1E3A5F] rounded-sm flex items-center justify-center"
                  >
                    {lastVisual === "screen" ? (
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.3, repeat: 6 }}
                        className="w-6 h-1 bg-white/40 rounded"
                      />
                    ) : (
                      <div className="w-1.5 h-1.5 bg-[#00FF00]/30 rounded-full" />
                    )}
                  </motion.div>
                </div>
              </div>
              
              <Character />
              
              {/* Sleep overlay */}
              <AnimatePresence>
                {lastVisual === "sleep" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#1A1A1A]/40 flex items-center justify-center"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: 2 }}
                      className="text-xl text-white/60"
                    >
                      z z z
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Feedback Text */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-3 left-1/2 -translate-x-1/2 z-50 text-[10px] text-[#4A6B5A] font-mono text-center whitespace-nowrap bg-[#E8DFD0] px-2 py-1 rounded shadow-lg border border-[#8B7355]"
                  >
                    {feedback}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 w-80">
            {currentActions.map((action, i) => (
              <motion.button
                key={`${action.label}-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02, backgroundColor: "rgba(107, 142, 123, 0.2)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => performAction(action)}
                className="px-3 py-2.5 text-[11px] text-[#A0A0A0] hover:text-white font-mono border border-[#3A3A3A] rounded bg-[#1A1A1A]/50 transition-colors text-left"
              >
                {action.label}
            </motion.button>
            ))}
          </div>

          {/* Actions Counter */}
          <div className="mt-4 text-xs text-[#404040] font-mono">
            Actions taken: {actionsTaken}
          </div>
        </div>

        {/* Right Panel - Event Log */}
        <CommandLinePanel 
          title="events.log" 
          logs={eventLog} 
          color="amber" 
        />
      </main>

      {/* Back Button */}
      <Link
        href="/"
        className="fixed bottom-6 left-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors z-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <Footer />
    </div>
  );
}
