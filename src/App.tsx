import React, { useState, useEffect, useRef, useTransition } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Pin,
  Minus,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Coffee,
  Brain,
  Moon,
} from "lucide-react";
import {
  minimizeWindow,
  closeWindow,
  setAlwaysOnTop,
  notifyTimerDone,
} from "./services/tauriBridge";
import { sound } from "./utils/sound";

type Mode = "work" | "shortBreak" | "longBreak";

interface ModeConfig {
  id: Mode;
  label: string;
  shortLabel: string;
  duration: number; // in seconds
  accentColor: string;
  ringColor: string;
  glowColor: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MODES: Record<Mode, ModeConfig> = {
  work: {
    id: "work",
    label: "Praca",
    shortLabel: "Skupienie",
    duration: 25 * 60,
    accentColor: "from-rose-500 to-amber-500",
    ringColor: "#f43f5e",
    glowColor: "rgba(244, 63, 94, 0.18)",
    badgeBg: "bg-rose-500/10 border-rose-500/25",
    badgeText: "text-rose-400",
    icon: Brain,
  },
  shortBreak: {
    id: "shortBreak",
    label: "Krótka",
    shortLabel: "Krótka przerwa",
    duration: 5 * 60,
    accentColor: "from-emerald-400 to-teal-500",
    ringColor: "#10b981",
    glowColor: "rgba(16, 185, 129, 0.18)",
    badgeBg: "bg-emerald-500/10 border-emerald-500/25",
    badgeText: "text-emerald-400",
    icon: Coffee,
  },
  longBreak: {
    id: "longBreak",
    label: "Długa",
    shortLabel: "Długa przerwa",
    duration: 15 * 60,
    accentColor: "from-cyan-400 to-blue-500",
    ringColor: "#06b6d4",
    glowColor: "rgba(6, 182, 212, 0.18)",
    badgeBg: "bg-cyan-500/10 border-cyan-500/25",
    badgeText: "text-cyan-400",
    icon: Moon,
  },
};

export default function App() {
  const [mode, setMode] = useState<Mode>("work");
  const [timeLeft, setTimeLeft] = useState<number>(MODES.work.duration);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  const timerRef = useRef<number | null>(null);
  const activeConfig = MODES[mode];

  // Request notification permissions once on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Sync mute state with sound utility
  useEffect(() => {
    sound.setMuted(isMuted);
  }, [isMuted]);

  // Window title update
  useEffect(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    document.title = `${formatted} - ${activeConfig.shortLabel}`;
  }, [timeLeft, activeConfig]);

  // Handle countdown interval
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, mode, completedSessions]);

  // Triggered when countdown hits 0
  const handleTimerComplete = () => {
    setIsRunning(false);
    sound.playCompleteChime(mode);

    if (mode === "work") {
      const nextSession = completedSessions + 1;
      setCompletedSessions(nextSession);

      const isLongBreakTime = nextSession % 4 === 0;
      const nextMode: Mode = isLongBreakTime ? "longBreak" : "shortBreak";

      notifyTimerDone(
        "Koniec sesji pracy! 🎯",
        isLongBreakTime
          ? "Świetna robota! Ukończono 4 sesje. Czas na 15 minut zasłużonej długiej przerwy."
          : "Znakomicie! Czas na 5 minut krótkiej przerwy i rozciągania."
      );

      switchMode(nextMode, false);
    } else {
      notifyTimerDone("Koniec przerwy! ⚡", "Wracamy do pracy. Skup się na kolejnym zadaniu!");
      switchMode("work", false);
    }
  };

  // Switch timer mode
  const switchMode = (newMode: Mode, userAction = true) => {
    if (userAction) {
      sound.playClick();
    }
    startTransition(() => {
      setMode(newMode);
      setTimeLeft(MODES[newMode].duration);
      setIsRunning(false);
    });
  };

  // Play / Pause toggle
  const togglePlay = () => {
    sound.playClick();
    setIsRunning((prev) => !prev);
  };

  // Stop / Finish current session early and advance to next
  const handleStopAndAdvance = () => {
    sound.playClick();
    setIsRunning(false);

    if (mode === "work") {
      const nextSession = completedSessions + 1;
      setCompletedSessions(nextSession);
      const isLongBreak = nextSession % 4 === 0;
      switchMode(isLongBreak ? "longBreak" : "shortBreak", false);
    } else {
      switchMode("work", false);
    }
  };

  // Reset current timer
  const handleReset = () => {
    sound.playClick();
    setIsRunning(false);
    setTimeLeft(activeConfig.duration);
  };

  // Toggle Always on Top
  const handleTogglePin = async () => {
    sound.playClick();
    const nextState = !isPinned;
    const applied = await setAlwaysOnTop(nextState);
    setIsPinned(applied);
  };

  // Format MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(seconds).padStart(2, "0");

  // Circular progress calculation
  const totalDuration = activeConfig.duration;
  const progressPercent = (timeLeft / totalDuration);
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressPercent * circumference;

  // Session cycle dots (1 to 4)
  const currentCycleDot = completedSessions % 4;

  const ModeIcon = activeConfig.icon;

  return (
    <div
      className="relative flex flex-col h-screen w-screen bg-[#0d0e12] text-neutral-100 select-none overflow-hidden rounded-2xl border border-white/10 shadow-2xl transition-colors duration-500"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 35%, ${activeConfig.glowColor} 0%, transparent 70%)`,
      }}
    >
      {/* Custom Titlebar / Top Drag Region */}
      <header
        data-tauri-drag-region
        className="tauri-drag flex items-center justify-between px-3 py-2.5 z-50 cursor-grab active:cursor-grabbing border-b border-white/[0.06] bg-black/20 backdrop-blur-md"
      >
        <div className="flex items-center space-x-2 pointer-events-none">
          <div
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isRunning ? "scale-110 animate-pulse bg-emerald-400" : "bg-neutral-600"
            }`}
          />
          <span className="text-[11px] font-semibold tracking-wider text-neutral-300 uppercase">
            Pomodoro
          </span>
        </div>

        {/* Window & Utility Controls (no-drag) */}
        <div className="flex items-center space-x-1 no-drag">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            title={isMuted ? "Włącz dźwięk" : "Wycisz"}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.08] transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Always on top toggle */}
          <button
            type="button"
            onClick={handleTogglePin}
            title={isPinned ? "Odepnij okno (Zawsze na wierzchu: WŁ)" : "Przypnij na wierzchu"}
            className={`p-1 rounded-md transition-all ${
              isPinned
                ? "text-amber-400 bg-amber-400/15 shadow-xs shadow-amber-500/30"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.08]"
            }`}
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-amber-400 rotate-45" : ""}`} />
          </button>

          {/* Minimize Window */}
          <button
            type="button"
            onClick={minimizeWindow}
            title="Minimalizuj"
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.08] transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Close Window */}
          <button
            type="button"
            onClick={closeWindow}
            title="Zamknij"
            className="p-1 rounded-md text-neutral-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-between px-4 py-3 z-10">
        {/* Mode Selector Tabs */}
        <div className="flex items-center p-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] backdrop-blur-md">
          {(["work", "shortBreak", "longBreak"] as Mode[]).map((tabKey) => {
            const isActive = mode === tabKey;
            const tab = MODES[tabKey];
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => switchMode(tabKey)}
                className={`relative px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-300 ${
                  isActive
                    ? "text-white bg-white/15 shadow-sm shadow-black/50"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Circular Progress & Digital Timer */}
        <div className="relative flex flex-col items-center justify-center my-auto">
          {/* SVG Circular Ring */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 150 150">
              {/* Background Track */}
              <circle
                cx="75"
                cy="75"
                r={radius}
                stroke="currentColor"
                strokeWidth="4"
                className="text-white/[0.06] fill-none"
              />
              {/* Animated Progress Ring */}
              <circle
                cx="75"
                cy="75"
                r={radius}
                stroke={activeConfig.ringColor}
                strokeWidth="4.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="fill-none transition-[stroke-dashoffset] duration-700 ease-out"
                style={{
                  filter: `drop-shadow(0 0 8px ${activeConfig.ringColor}88)`,
                }}
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {/* Mode Icon & Status Pill */}
              <div
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border mb-1 transition-all ${activeConfig.badgeBg} ${activeConfig.badgeText}`}
              >
                <ModeIcon className="w-2.5 h-2.5" />
                <span>{activeConfig.shortLabel}</span>
              </div>

              {/* Digits Display */}
              <div className="font-mono-numbers text-3xl font-bold tracking-tight text-white drop-shadow-md">
                <span>{formattedMinutes}</span>
                <span className={`transition-opacity duration-300 ${isRunning ? "opacity-70" : "opacity-100"}`}>:</span>
                <span>{formattedSeconds}</span>
              </div>

              {/* Cycle dots indicator */}
              <div className="flex items-center space-x-1.5 mt-2">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = idx < currentCycleDot;
                  const isCurrent = idx === currentCycleDot && mode === "work" && isRunning;
                  return (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isCurrent
                          ? "w-4 bg-rose-400 animate-pulse"
                          : isFilled
                          ? "w-2.5 bg-white/70"
                          : "w-1.5 bg-white/15"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="w-full flex items-center justify-center space-x-3 pb-1">
          {/* Reset Button */}
          <button
            type="button"
            onClick={handleReset}
            title="Resetuj odliczanie"
            className="p-2.5 rounded-full text-neutral-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Primary Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            title={isRunning ? "Wstrzymaj" : "Rozpocznij"}
            className={`px-6 py-2.5 rounded-full flex items-center space-x-2 font-semibold text-xs text-white shadow-lg shadow-black/40 active:scale-95 transition-all duration-300 bg-gradient-to-r ${activeConfig.accentColor} hover:brightness-110 hover:shadow-xl`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span>Pauza</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white ml-0.5" />
                <span>Start</span>
              </>
            )}
          </button>

          {/* Stop / Skip to Next Session Button */}
          <button
            type="button"
            onClick={handleStopAndAdvance}
            title="Zatrzymaj i przejdź do następnej sesji"
            className="p-2.5 rounded-full text-neutral-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] active:scale-95 transition-all"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Footer Statistics / Session info */}
        <footer className="w-full pt-1.5 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-neutral-500 font-medium">
          <div className="flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-neutral-400" />
            <span>Cykl {Math.floor(completedSessions / 4) + 1}</span>
          </div>
          <span>Sesja {completedSessions % 4 + 1}/4</span>
        </footer>
      </main>
    </div>
  );
}
