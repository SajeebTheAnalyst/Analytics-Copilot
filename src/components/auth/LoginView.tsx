import React, { useState, useEffect } from 'react';
import { useFirebase } from './FirebaseProvider';
import { Button } from '@/components/ui/button';
import { LogIn, BarChart3, Database, Sparkles, Activity, Clock, ShieldCheck, PieChart, Cloud, ArrowUpRight, Folder } from 'lucide-react';
import { motion } from 'motion/react';

// Reusable Particles
const Particles = () => {
  const [particles] = useState(() => 
    Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
      color: ['bg-[#1677FF]', 'bg-[#00D9FF]', 'bg-[#7C3AED]', 'bg-[#EC4899]'][Math.floor(Math.random() * 4)]
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${p.color} opacity-30 dark:opacity-50`}
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            boxShadow: `0 0 ${p.size * 3}px currentColor`
          }}
          animate={{
            y: [0, -150, 0],
            x: [0, Math.random() * 40 - 20, 0],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
};

const FlowingLines = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-60 z-0">
    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="neonBlue" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1677FF" stopOpacity="0"/>
          <stop offset="50%" stopColor="#00D9FF" stopOpacity="1"/>
          <stop offset="100%" stopColor="#1677FF" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="neonPurple" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0"/>
          <stop offset="50%" stopColor="#EC4899" stopOpacity="1"/>
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Wave 1 */}
      <motion.path 
        d="M -10,30 C 30,50 70,10 110,30" 
        fill="none" 
        stroke="url(#neonBlue)" 
        strokeWidth="0.15"
        filter="url(#glow)"
        animate={{ d: ["M -10,30 C 30,50 70,10 110,30", "M -10,30 C 40,60 60,0 110,30", "M -10,30 C 30,50 70,10 110,30"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Wave 2 */}
      <motion.path 
        d="M -10,70 C 40,40 60,90 110,70" 
        fill="none" 
        stroke="url(#neonPurple)" 
        strokeWidth="0.1"
        filter="url(#glow)"
        animate={{ d: ["M -10,70 C 40,40 60,90 110,70", "M -10,70 C 20,20 80,100 110,70", "M -10,70 C 40,40 60,90 110,70"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      {/* Wave 3 - subtle grid-like curved line */}
       <motion.path 
        d="M -10,50 C 30,30 70,70 110,50" 
        fill="none" 
        stroke="url(#neonBlue)" 
        strokeWidth="0.05"
        animate={{ d: ["M -10,50 C 30,30 70,70 110,50", "M -10,50 C 40,20 60,80 110,50", "M -10,50 C 30,30 70,70 110,50"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 5 }}
      />
    </svg>
  </div>
);

const HudWidget = ({ className, children, delay = 0, floatRange = 10 }: any) => (
  <motion.div
    className={`absolute hidden lg:flex flex-col p-4 rounded-[20px] bg-white/50 dark:bg-transparent lg:dark:bg-[#080D1C]/40 backdrop-blur-md border border-slate-200 dark:border-[#1677FF]/20 shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-10 ${className}`}
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: [0, -floatRange, 0], opacity: 1 }}
    transition={{ 
      y: { duration: 6 + Math.random() * 2, repeat: Infinity, ease: "easeInOut", delay },
      opacity: { duration: 1, delay: delay * 0.5 } 
    }}
  >
    {children}
  </motion.div>
);

export function LoginView() {
  const { login, loading } = useFirebase();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    records: 12.4,
    accuracy: 78,
    sync: 2.4
  });

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setError(null);
      await login();
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for Google Sign-In in Firebase.');
      } else {
        setError(err.message || 'Authentication failed. Please check your configuration and try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Randomize some numbers slightly for a "live" feel
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        records: +(prev.records + Math.random() * 0.05).toFixed(2),
        accuracy: +(Math.min(99.9, prev.accuracy + (Math.random() * 0.2 - 0.1))).toFixed(1),
        sync: +(Math.max(0.5, prev.sync + (Math.random() * 0.1 - 0.05))).toFixed(2)
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#02040B] relative overflow-hidden transition-colors duration-500 font-sans">
      
      {/* Background Deep Glow - Specifically dark mode matched */}
      <div className="absolute inset-0 dark:bg-[radial-gradient(ellipse_at_center,#06102A_0%,#02040B_80%)] pointer-events-none z-0"></div>
      
      {/* Subtle Dark Blue Grid */}
      <div className="absolute inset-0 dark:bg-[linear-gradient(to_right,#1677ff08_1px,transparent_1px),linear-gradient(to_bottom,#1677ff08_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none z-0"></div>
      
      <Particles />
      <FlowingLines />
      
      {/* ---- LEFT HUD ELEMENTS ---- */}
      
      {/* DATA STREAM */}
      <HudWidget className="top-[12%] left-[4%] xl:left-[10%]" delay={0}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse"></div>
          <span className="text-[9px] font-bold text-slate-500 dark:text-[#00D9FF] tracking-widest uppercase">Data Stream</span>
        </div>
        <div className="flex items-end gap-1.5 h-12">
          {[40, 70, 45, 90, 65, 85, 50, 75].map((h, i) => (
             <motion.div 
               key={i} 
               className="w-2 rounded-t-[2px]"
               style={{ background: `linear-gradient(to top, #1677FF, #7C3AED)` }}
               animate={{ height: [`${h}%`, `${Math.max(20, h + (Math.random() * 40 - 20))}%`, `${h}%`] }}
               transition={{ duration: 2 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
             />
          ))}
        </div>
      </HudWidget>

      {/* DATABASE CYLINDER */}
      <motion.div 
         className="absolute hidden lg:flex top-[35%] left-[8%] xl:left-[14%] z-10"
         animate={{ y: [0, -8, 0] }}
         transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <div className="p-4 rounded-2xl bg-white/50 dark:bg-[#080D1C]/50 backdrop-blur-md border border-slate-200 dark:border-[#1677FF]/30 shadow-lg dark:shadow-[0_0_20px_rgba(22,119,255,0.2)]">
          <Database className="w-8 h-8 text-[#1677FF] dark:text-[#00D9FF] dark:drop-shadow-[0_0_8px_rgba(0,217,255,0.6)]" />
        </div>
      </motion.div>

      {/* DATA QUALITY RING */}
      <HudWidget className="top-[55%] left-[5%] xl:left-[12%]" delay={2}>
         <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
               <circle cx="50" cy="50" r="40" fill="none" className="stroke-slate-200 dark:stroke-[#06102A]" strokeWidth="8" />
               <motion.circle 
                 cx="50" cy="50" r="40" 
                 fill="none" 
                 stroke="url(#ringGrad)"
                 strokeWidth="8" 
                 strokeDasharray="251"
                 strokeLinecap="round"
                 animate={{ strokeDashoffset: 251 * (1 - metrics.accuracy / 100) }}
                 transition={{ duration: 1 }}
               />
               <defs>
                 <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                   <stop offset="0%" stopColor="#1677FF"/>
                   <stop offset="100%" stopColor="#00D9FF"/>
                 </linearGradient>
               </defs>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-black text-slate-800 dark:text-[#F8FAFC]">{metrics.accuracy.toFixed(0)}%</span>
            </div>
         </div>
         <div className="text-[9px] font-bold text-slate-500 dark:text-[#A8B3C7] mt-3 text-center tracking-widest uppercase">Data Quality</div>
      </HudWidget>

      {/* DATA FLOW LINE CHART */}
      <HudWidget className="bottom-[10%] left-[8%] xl:left-[16%]" delay={1.5}>
        <div className="text-[9px] font-bold text-slate-500 dark:text-[#1677FF] mb-2 tracking-widest uppercase">Data Flow</div>
        <svg width="100" height="40" viewBox="0 0 100 40">
           <motion.path 
             d="M0,30 L20,25 L40,35 L60,15 L80,20 L100,5" 
             fill="none" 
             stroke="#00D9FF" 
             strokeWidth="2"
             className="dark:drop-shadow-[0_0_4px_rgba(0,217,255,0.5)]"
             animate={{ d: [
               "M0,30 L20,25 L40,35 L60,15 L80,20 L100,5",
               "M0,35 L20,15 L40,25 L60,5 L80,25 L100,10",
               "M0,30 L20,25 L40,35 L60,15 L80,20 L100,5"
             ] }}
             transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
           />
        </svg>
      </HudWidget>


      {/* ---- RIGHT HUD ELEMENTS ---- */}
      
      {/* PIE CHART */}
      <HudWidget className="top-[10%] right-[5%] xl:right-[12%]" delay={1.2}>
         <div className="flex items-center gap-6">
           <div className="relative w-16 h-16 rounded-full border-4 border-slate-200 dark:border-[#7C3AED] dark:border-t-[#00D9FF] dark:border-r-[#EC4899] dark:shadow-[0_0_15px_rgba(124,58,237,0.4)] animate-[spin_10s_linear_infinite]"></div>
           <div className="absolute inset-0 flex items-center justify-center">
              <PieChart className="w-8 h-8 text-[#1677FF] dark:text-[#00D9FF] opacity-50" />
           </div>
           <div className="space-y-2">
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#7C3AED]"></div><span className="text-[10px] font-bold text-slate-700 dark:text-[#F8FAFC]">45%</span></div>
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00D9FF]"></div><span className="text-[10px] font-bold text-slate-700 dark:text-[#F8FAFC]">30%</span></div>
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#EC4899]"></div><span className="text-[10px] font-bold text-slate-700 dark:text-[#F8FAFC]">25%</span></div>
           </div>
         </div>
      </HudWidget>

      {/* DATA SYNC */}
      <HudWidget className="top-[32%] right-[8%] xl:right-[15%]" delay={0.5}>
         <div className="flex justify-between items-center mb-3 min-w-[120px]">
           <span className="text-[9px] font-bold text-slate-500 dark:text-[#A8B3C7] tracking-widest uppercase">Data Sync</span>
         </div>
         <div className="flex items-center gap-2 mb-3">
           <div className="w-2 h-2 rounded-full bg-[#00E5A0] dark:shadow-[0_0_8px_rgba(0,229,160,0.8)] animate-pulse"></div>
           <span className="text-[10px] font-bold text-[#00E5A0]">Realtime</span>
         </div>
         <div className="space-y-2">
           <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
             <motion.div className="h-full bg-[#1677FF]" animate={{ width: ["30%", "80%", "30%"] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
           </div>
           <div className="h-1.5 w-3/4 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
             <motion.div className="h-full bg-[#7C3AED]" animate={{ width: ["50%", "90%", "50%"] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
           </div>
         </div>
      </HudWidget>

      {/* FOLDER ICON */}
      <motion.div 
         className="absolute hidden lg:flex top-[55%] right-[6%] xl:right-[10%] z-10"
         animate={{ y: [0, -10, 0] }}
         transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
      >
        <Folder className="w-12 h-12 text-[#1677FF] dark:text-[#A855F7] dark:drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
      </motion.div>

      {/* RIGHT ANALYTICS BAR CHART */}
      <HudWidget className="bottom-[22%] right-[10%] xl:right-[18%]" delay={3}>
         <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#EC4899] animate-pulse"></div>
          <span className="text-[9px] font-bold text-slate-600 dark:text-[#A8B3C7] tracking-widest uppercase">Analytics</span>
        </div>
        <div className="flex items-end gap-1.5 h-12">
          {[30, 40, 60, 50, 80, 95].map((h, i) => (
             <div 
               key={i} 
               className="w-2.5 rounded-t-[2px]"
               style={{ background: `linear-gradient(to top, #7C3AED, #EC4899)`, height: `${h}%` }}
             />
          ))}
        </div>
        <div className="absolute right-0 bottom-[-30px]">
           <Cloud className="w-8 h-8 text-[#1677FF] dark:text-[#00D9FF] dark:drop-shadow-[0_0_10px_rgba(0,217,255,0.4)]" />
        </div>
      </HudWidget>

      {/* ---- MAIN LOGIN CARD WRAPPER ---- */}
      <motion.div 
        className="relative z-20 w-full max-w-[440px] mx-6 group perspective-1000"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, y: [0, -6, 0] }}
        transition={{ 
          scale: { duration: 1, ease: "easeOut" },
          opacity: { duration: 1 },
          y: { duration: 8, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        {/* Animated Neon Gradient Border + Glow Layer (Dark Mode Only) */}
        <div className="absolute -inset-[1.5px] rounded-[30px] overflow-hidden opacity-0 dark:opacity-70 dark:group-hover:opacity-100 transition-opacity duration-700">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,#1677FF_0deg,#00D9FF_60deg,#7C3AED_120deg,#EC4899_180deg,#FF9D2E_240deg,#00E5A0_300deg,#1677FF_360deg)]"
          />
        </div>

        {/* Deep Blurred Glow Behind Card */}
        <div className="absolute -inset-[2px] rounded-[30px] overflow-hidden opacity-0 dark:opacity-40 blur-2xl dark:group-hover:opacity-70 transition-opacity duration-700 pointer-events-none z-[-1]">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,#1677FF_0deg,#00D9FF_60deg,#7C3AED_120deg,#EC4899_180deg,#FF9D2E_240deg,#00E5A0_300deg,#1677FF_360deg)]"
          />
        </div>

        {/* Card Content Layer - Premium Glass */}
        <div className="relative p-10 bg-white/90 dark:bg-[rgba(8,13,28,0.72)] backdrop-blur-3xl rounded-[28px] shadow-2xl dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.5)] flex flex-col items-center overflow-hidden transition-all duration-500">
          
          {/* Glass Inner Glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C3AED] opacity-0 dark:opacity-15 blur-[80px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#00D9FF] opacity-0 dark:opacity-15 blur-[80px] pointer-events-none"></div>

          {/* Logo */}
          <div className="relative w-16 h-16 mb-8 group-hover:scale-105 transition-transform duration-500">
            <div className="absolute inset-0 rounded-[18px] border border-slate-200 dark:border-[#1677FF]/40 bg-slate-50 dark:bg-[#080D1C]/50 dark:shadow-[0_0_20px_rgba(22,119,255,0.3)] animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-[#1677FF] dark:drop-shadow-[0_0_8px_rgba(22,119,255,0.8)]" />
            </div>
          </div>
          
          <div className="text-center space-y-3 mb-10 relative z-10">
            <h1 className="text-[28px] leading-tight font-[800] text-slate-900 dark:text-[#F8FAFC] tracking-tight">Analytics Copilot</h1>
            <p className="text-[13px] text-slate-500 dark:text-[#A8B3C7] font-medium">Professional Data Cleaning & KPI Analytics</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mb-10 relative z-10">
            {/* Feature 1 */}
            <div className="group/feat p-4 bg-slate-50 dark:bg-[rgba(15,23,42,0.65)] rounded-[20px] border border-slate-200 dark:border-[rgba(37,99,235,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(22,119,255,0.15)] dark:hover:border-[#1677FF]/60 cursor-default">
              <Database className="w-6 h-6 text-[#1677FF] dark:text-[#00D9FF] mb-3 transition-transform duration-300 group-hover/feat:scale-110 drop-shadow-[0_0_8px_rgba(0,217,255,0)] dark:group-hover/feat:drop-shadow-[0_0_8px_rgba(0,217,255,0.5)]" />
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-[#F8FAFC]">Smart Cleaning</h3>
              <p className="text-[10px] text-slate-500 dark:text-[#A8B3C7] mt-1.5 leading-relaxed">AI-powered data preparation</p>
            </div>
            {/* Feature 2 */}
            <div className="group/feat p-4 bg-slate-50 dark:bg-[rgba(15,23,42,0.65)] rounded-[20px] border border-slate-200 dark:border-[rgba(37,99,235,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(236,72,153,0.15)] dark:hover:border-[#EC4899]/60 cursor-default">
              <Sparkles className="w-6 h-6 text-[#7C3AED] dark:text-[#EC4899] mb-3 transition-transform duration-300 group-hover/feat:scale-110 drop-shadow-[0_0_8px_rgba(236,72,153,0)] dark:group-hover/feat:drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-[#F8FAFC]">KPI Builder</h3>
              <p className="text-[10px] text-slate-500 dark:text-[#A8B3C7] mt-1.5 leading-relaxed">Dynamic metrics & targets</p>
            </div>
          </div>

          <Button 
            onClick={handleLogin} 
            disabled={loading || isLoggingIn}
            className="w-full bg-[#155EEF] hover:bg-[#3B82F6] text-white font-[700] text-[15px] h-14 rounded-2xl transition-all shadow-lg dark:shadow-[0_0_20px_rgba(21,94,239,0.4)] dark:hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] flex items-center justify-center gap-3 border border-blue-400/20 relative z-10"
          >
            {loading || isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <div className="bg-white p-[3px] rounded-full flex items-center justify-center w-6 h-6"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" /></div>
                Sign in with Google
              </>
            )}
          </Button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-center relative z-10 w-full animate-in fade-in slide-in-from-top-2">
              <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-medium text-slate-500 dark:text-[#94A3B8] relative z-10">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00E5A0] dark:drop-shadow-[0_0_4px_rgba(0,229,160,0.4)]" />
            <span>Secure multi-device cloud synchronization enabled</span>
          </div>
        </div>
      </motion.div>

      {/* Bottom Metrics Bar */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 md:gap-8 lg:gap-12 opacity-0 animate-in fade-in duration-1000 delay-500 z-10">
         
         <div className="flex items-center gap-2.5">
           <Database className="w-4 h-4 text-[#1677FF]" />
           <div>
             <div className="text-[13px] md:text-[15px] font-[800] text-slate-800 dark:text-[#F8FAFC] font-mono">{metrics.records.toFixed(1)}k</div>
             <div className="text-[8px] md:text-[9px] text-slate-500 dark:text-[#A8B3C7] uppercase tracking-widest mt-0.5">Records Processed</div>
           </div>
         </div>

         <div className="w-px h-8 bg-slate-200 dark:bg-white/10 hidden md:block"></div>

         <div className="flex items-center gap-2.5">
           <Activity className="w-4 h-4 text-[#00D9FF]" />
           <div>
             <div className="text-[13px] md:text-[15px] font-[800] text-slate-800 dark:text-[#F8FAFC] font-mono">8.7k</div>
             <div className="text-[8px] md:text-[9px] text-slate-500 dark:text-[#A8B3C7] uppercase tracking-widest mt-0.5">KPIs Tracked</div>
           </div>
         </div>

         <div className="w-px h-8 bg-slate-200 dark:bg-white/10 hidden sm:block"></div>

         <div className="hidden sm:flex items-center gap-2.5">
           <PieChart className="w-4 h-4 text-[#7C3AED]" />
           <div>
             <div className="text-[13px] md:text-[15px] font-[800] text-slate-800 dark:text-[#F8FAFC] font-mono">{metrics.accuracy.toFixed(1)}%</div>
             <div className="text-[8px] md:text-[9px] text-slate-500 dark:text-[#A8B3C7] uppercase tracking-widest mt-0.5">Data Accuracy</div>
           </div>
         </div>

         <div className="w-px h-8 bg-slate-200 dark:bg-white/10 hidden md:block"></div>

         <div className="hidden md:flex items-center gap-2.5">
           <Clock className="w-4 h-4 text-[#00E5A0]" />
           <div>
             <div className="text-[13px] md:text-[15px] font-[800] text-slate-800 dark:text-[#F8FAFC] font-mono">{metrics.sync.toFixed(1)}s</div>
             <div className="text-[8px] md:text-[9px] text-slate-500 dark:text-[#A8B3C7] uppercase tracking-widest mt-0.5">Avg. Sync Time</div>
           </div>
         </div>

      </div>

    </div>
  );
}


