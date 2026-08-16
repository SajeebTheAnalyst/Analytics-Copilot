import React, { useState, useEffect } from 'react';
import { useFirebase } from './FirebaseProvider';
import { Button } from '@/components/ui/button';
import { LogIn, BarChart3, Database, Sparkles, Activity, Clock, ShieldCheck, PieChart, Cloud, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

const Particles = () => {
  // Generate stable random particles once
  const [particles] = useState(() => 
    Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-blue-500/40 dark:bg-blue-400/40"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            boxShadow: `0 0 ${p.size * 2}px rgba(59, 130, 246, 0.5)`
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 30 - 15, 0],
            opacity: [0.1, 0.6, 0.1],
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

const HudWidget = ({ className, children, delay = 0 }: any) => (
  <motion.div
    className={`absolute hidden lg:flex flex-col p-4 rounded-2xl bg-white/10 dark:bg-black/40 backdrop-blur-md border border-white/20 dark:border-white/5 shadow-2xl ${className}`}
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: [0, -10, 0], opacity: 1 }}
    transition={{ 
      y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay },
      opacity: { duration: 1, delay: delay * 0.5 } 
    }}
  >
    {children}
  </motion.div>
);

export function LoginView() {
  const { login, loading } = useFirebase();
  const [metrics, setMetrics] = useState({
    records: 12.4,
    accuracy: 96.3,
    sync: 2.4
  });

  // Randomize some numbers slightly for a "live" feel
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        records: +(prev.records + Math.random() * 0.1).toFixed(1),
        accuracy: +(Math.min(99.9, prev.accuracy + (Math.random() * 0.4 - 0.2))).toFixed(1),
        sync: +(Math.max(0.5, prev.sync + (Math.random() * 0.2 - 0.1))).toFixed(1)
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#030014] relative overflow-hidden transition-colors duration-500">
      
      {/* Immersive Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.08)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(29,78,216,0.15)_0%,transparent_70%)] pointer-events-none"></div>
      
      {/* Animated Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)] pointer-events-none"></div>
      
      <Particles />
      
      {/* Data Lines Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-50">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0"/>
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1"/>
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0"/>
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="1"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <motion.path 
            d="M -10,50 Q 25,30 50,50 T 110,50" 
            fill="none" 
            stroke="url(#lineGrad1)" 
            strokeWidth="0.2"
            animate={{ d: ["M -10,50 Q 25,30 50,50 T 110,50", "M -10,50 Q 25,70 50,50 T 110,50", "M -10,50 Q 25,30 50,50 T 110,50"] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path 
            d="M -10,60 Q 35,40 60,60 T 110,60" 
            fill="none" 
            stroke="url(#lineGrad2)" 
            strokeWidth="0.15"
            animate={{ d: ["M -10,60 Q 35,40 60,60 T 110,60", "M -10,60 Q 35,80 60,60 T 110,60", "M -10,60 Q 35,40 60,60 T 110,60"] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.path 
            d="M -10,40 Q 40,20 70,40 T 110,40" 
            fill="none" 
            stroke="url(#lineGrad1)" 
            strokeWidth="0.1"
            animate={{ d: ["M -10,40 Q 40,20 70,40 T 110,40", "M -10,40 Q 40,60 70,40 T 110,40", "M -10,40 Q 40,20 70,40 T 110,40"] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          />
        </svg>
      </div>

      {/* HUD Elements (lg only) */}
      <HudWidget className="top-[15%] left-[8%] xl:left-[15%]" delay={0}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 tracking-wider">DATA STREAM</span>
        </div>
        <div className="flex items-end gap-1.5 h-14">
          {[40, 70, 45, 90, 65, 85, 50, 75].map((h, i) => (
             <motion.div 
               key={i} 
               className="w-2.5 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-sm"
               animate={{ height: [`${h}%`, `${Math.max(20, h + (Math.random() * 40 - 20))}%`, `${h}%`] }}
               transition={{ duration: 2 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
             />
          ))}
        </div>
      </HudWidget>

      <HudWidget className="bottom-[25%] left-[10%] xl:left-[18%]" delay={2}>
         <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
               <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-slate-200 dark:text-white/10" strokeWidth="6" />
               <motion.circle 
                 cx="50" cy="50" r="40" 
                 fill="none" 
                 stroke="currentColor"
                 className="text-blue-500"
                 strokeWidth="6" 
                 strokeDasharray="251"
                 strokeDashoffset="251"
                 strokeLinecap="round"
                 animate={{ strokeDashoffset: 251 * (1 - metrics.accuracy / 100) }}
                 transition={{ duration: 1 }}
               />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-black text-slate-800 dark:text-white">{metrics.accuracy.toFixed(0)}%</span>
            </div>
         </div>
         <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2 text-center">DATA QUALITY</div>
      </HudWidget>

      <HudWidget className="top-[20%] right-[8%] xl:right-[15%]" delay={1}>
         <div className="flex items-center gap-6">
           <PieChart className="w-14 h-14 text-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
           <div className="space-y-1.5">
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div><span className="text-xs font-medium text-slate-700 dark:text-slate-300">45%</span></div>
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-xs font-medium text-slate-700 dark:text-slate-300">30%</span></div>
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-500"></div><span className="text-xs font-medium text-slate-700 dark:text-slate-300">25%</span></div>
           </div>
         </div>
      </HudWidget>
      
      <HudWidget className="bottom-[28%] right-[10%] xl:right-[18%]" delay={3}>
         <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 tracking-wider">ANALYTICS</span>
        </div>
        <div className="flex items-end gap-1.5 h-12">
          {[30, 40, 60, 50, 80, 95].map((h, i) => (
             <div 
               key={i} 
               className="w-3.5 bg-gradient-to-t from-purple-600 to-pink-400 rounded-t-sm"
               style={{ height: `${h}%` }}
             />
          ))}
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
           <Cloud className="w-4 h-4 text-blue-500" />
           <div className="flex items-center gap-1">
             <ArrowUpRight className="w-3 h-3 text-emerald-500" />
             <span className="text-[10px] text-emerald-500 font-bold">+12%</span>
           </div>
        </div>
      </HudWidget>

      {/* Main Login Card Wrapper */}
      <motion.div 
        className="relative z-20 w-full max-w-[420px] mx-6 group"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, y: [0, -4, 0] }}
        transition={{ 
          scale: { duration: 0.8, ease: "easeOut" },
          opacity: { duration: 0.8 },
          y: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }
        }}
      >
        {/* Animated Gradient Border Layer */}
        <div className="absolute -inset-[2px] rounded-[34px] overflow-hidden opacity-50 dark:opacity-100 transition-opacity duration-500 group-hover:opacity-100">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,#3b82f6_0deg,#22d3ee_90deg,#a855f7_180deg,#ec4899_270deg,#3b82f6_360deg)] opacity-70 blur-[4px]"
          />
        </div>
        
        {/* Card Content Layer */}
        <div className="relative p-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl rounded-[32px] border border-white/50 dark:border-white/10 shadow-[0_0_80px_rgba(59,130,246,0.15)] flex flex-col items-center transition-all duration-500 group-hover:shadow-[0_0_100px_rgba(168,85,247,0.2)]">
          
          <div className="w-20 h-20 mb-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
            <BarChart3 className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Analytics Copilot</h1>
            <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium">Professional Data Cleaning & KPI Analytics</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mb-8">
            <div className="p-4 bg-slate-100/50 dark:bg-zinc-900/50 rounded-2xl border border-slate-200/50 dark:border-white/5 transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800/80">
              <Database className="w-5 h-5 text-blue-500 mb-2" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-white">Smart Cleaning</h3>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1">AI-powered data preparation</p>
            </div>
            <div className="p-4 bg-slate-100/50 dark:bg-zinc-900/50 rounded-2xl border border-slate-200/50 dark:border-white/5 transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800/80">
              <Sparkles className="w-5 h-5 text-purple-500 mb-2" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-white">KPI Builder</h3>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1">Dynamic metrics & targets</p>
            </div>
          </div>

          <Button 
            onClick={login} 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white font-bold h-14 rounded-2xl transition-all shadow-[0_8px_30px_rgba(37,99,235,0.25)] hover:shadow-[0_8px_40px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3 border border-blue-400/30"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <div className="bg-white p-1 rounded-full"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" /></div>
                <span className="text-[15px]">Sign in with Google</span>
              </>
            )}
          </Button>

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-medium text-slate-500 dark:text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secure multi-device cloud synchronization enabled</span>
          </div>
        </div>
      </motion.div>

      {/* Bottom Metrics Bar */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 md:gap-12 lg:gap-16 opacity-0 animate-in fade-in duration-1000 delay-500 z-10">
         <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 dark:bg-black/20 backdrop-blur-sm border border-slate-200/50 dark:border-white/5">
           <Database className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
           <div>
             <div className="text-xs md:text-sm font-bold text-slate-800 dark:text-white">{metrics.records.toFixed(1)}k</div>
             <div className="text-[9px] md:text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Records Processed</div>
           </div>
         </div>
         <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 dark:bg-black/20 backdrop-blur-sm border border-slate-200/50 dark:border-white/5">
           <Activity className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
           <div>
             <div className="text-xs md:text-sm font-bold text-slate-800 dark:text-white">8.7k</div>
             <div className="text-[9px] md:text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider">KPIs Tracked</div>
           </div>
         </div>
         <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 dark:bg-black/20 backdrop-blur-sm border border-slate-200/50 dark:border-white/5">
           <PieChart className="w-4 h-4 md:w-5 md:h-5 text-pink-500" />
           <div>
             <div className="text-xs md:text-sm font-bold text-slate-800 dark:text-white">{metrics.accuracy.toFixed(1)}%</div>
             <div className="text-[9px] md:text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Data Accuracy</div>
           </div>
         </div>
         <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 dark:bg-black/20 backdrop-blur-sm border border-slate-200/50 dark:border-white/5">
           <Clock className="w-4 h-4 md:w-5 md:h-5 text-cyan-500" />
           <div>
             <div className="text-xs md:text-sm font-bold text-slate-800 dark:text-white">{metrics.sync.toFixed(1)}s</div>
             <div className="text-[9px] md:text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Avg. Sync Time</div>
           </div>
         </div>
      </div>
    </div>
  );
}

