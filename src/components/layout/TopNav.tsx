import { Moon, Sun, Upload, Settings } from 'lucide-react';
import { Button } from '../ui/button';

export function TopNav() {
  return (
    <header className="h-14 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between px-4 lg:px-6 z-10 relative">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center shadow-inner">
          <span className="text-white font-bold leading-none text-lg tracking-tighter">Ac</span>
        </div>
        <span className="font-semibold tracking-tight text-lg text-zinc-900 dark:text-zinc-50">
          Analytics Copilot
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
          <Upload className="w-4 h-4" />
          <span>Import Files</span>
        </Button>
        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>
        <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50">
          <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50">
          <Settings className="w-[18px] h-[18px]" />
        </Button>
      </div>
    </header>
  );
}
