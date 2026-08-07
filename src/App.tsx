import { useState } from 'react';
import { TopNav } from './components/layout/TopNav';
import { Sidebar } from './components/layout/Sidebar';
import { RightPanel } from './components/layout/RightPanel';
import { DatasetManager } from './components/workspace/DatasetManager';
import { DataPreview } from './components/workspace/DataPreview';
import { Dataset } from '@/types';

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);

  const handleImport = (newDatasets: Dataset[]) => {
    setDatasets(prev => [...prev, ...newDatasets]);
  };

  const handleRemove = (id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
    if (selectedDatasetId === id) {
      setSelectedDatasetId(null);
    }
  };

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#050505] text-zinc-900 dark:text-zinc-50 font-sans selection:bg-blue-200 dark:selection:bg-blue-900/50 overflow-hidden">
      <TopNav />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          datasets={datasets}
          selectedDatasetId={selectedDatasetId}
          onSelectDataset={setSelectedDatasetId}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-zinc-50/50 dark:bg-[#050505]">
          {selectedDatasetId && selectedDataset ? (
            <DataPreview dataset={selectedDataset} />
          ) : (
            <DatasetManager 
              datasets={datasets}
              onImport={handleImport}
              onRemove={handleRemove}
              onPreview={setSelectedDatasetId}
            />
          )}
        </main>

        <RightPanel />
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a1a1aa; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
    </div>
  );
}
