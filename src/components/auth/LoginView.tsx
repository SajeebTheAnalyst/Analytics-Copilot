import React from 'react';
import { useFirebase } from './FirebaseProvider';
import { Button } from '@/components/ui/button';
import { LogIn, BarChart3, Database, Sparkles } from 'lucide-react';

export function LoginView() {
  const { login, loading } = useFirebase();

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#09090b] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.05),transparent_50%)]"></div>
      
      <div className="relative z-10 max-w-md w-full px-6 py-12 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-4">
          <div className="w-20 h-20 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-[0_0_40px_rgba(37,99,235,0.15)]">
            <BarChart3 className="w-10 h-10 text-blue-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tighter">Analytics Copilot</h1>
            <p className="text-zinc-400 text-sm">Professional Data Cleaning & KPI Analytics</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
            <Database className="w-5 h-5 text-blue-400 mb-2" />
            <h3 className="text-xs font-bold text-white">Smart Cleaning</h3>
            <p className="text-[10px] text-zinc-500 mt-1">AI-powered data preparation</p>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
            <Sparkles className="w-5 h-5 text-purple-400 mb-2" />
            <h3 className="text-xs font-bold text-white">KPI Builder</h3>
            <p className="text-[10px] text-zinc-500 mt-1">Dynamic metrics & targets</p>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            onClick={login} 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-2xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sign in with Google
              </>
            )}
          </Button>
          <p className="text-[10px] text-zinc-500 mt-4">Secure multi-device cloud synchronization enabled</p>
        </div>
      </div>
    </div>
  );
}
