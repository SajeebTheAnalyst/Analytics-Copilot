import { useState, useEffect } from 'react';
import { TopNav } from './components/layout/TopNav';
import { Sidebar } from './components/layout/Sidebar';
import { RightPanel } from './components/layout/RightPanel';
import { DatasetManager } from './components/workspace/DatasetManager';
import { DataPreview } from './components/workspace/DataPreview';
import { RelationshipView } from './components/relationships/RelationshipView';
import { Dataset, ViewState, RelationshipSuggestion } from '@/types';
import { detectRelationships } from '@/lib/relationshipDetector';

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('data-manager');
  const [isUploading, setIsUploading] = useState(false);
  
  const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);

  useEffect(() => {
    // Detect relationships when datasets change
    const newSuggestions = detectRelationships(datasets);
    
    // Merge with existing status
    setSuggestions(prev => {
      const existing = new Map<string, RelationshipSuggestion>(prev.map(p => [p.id, p]));
      return newSuggestions.map(ns => {
        const ext = existing.get(ns.id);
        if (ext) return { ...ns, status: ext.status };
        return ns;
      });
    });
  }, [datasets]);

  const handleImport = (newDatasets: Dataset[]) => {
    setDatasets(prev => [...prev, ...newDatasets]);
    setIsUploading(false);
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
      <TopNav 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onImportFiles={() => {
          setIsUploading(true);
          setCurrentView('data-manager');
        }} 
      />

      <div className="flex-1 flex overflow-hidden">
        {currentView === 'data-manager' ? (
          <>
            <Sidebar 
              datasets={datasets}
              selectedDatasetId={selectedDatasetId}
              onSelectDataset={(id) => {
                setSelectedDatasetId(id);
                setIsUploading(false);
              }}
              onRemoveDataset={handleRemove}
            />

            <main className="flex-1 flex flex-col min-w-0 bg-zinc-50/50 dark:bg-[#050505]">
              {datasets.length === 0 || isUploading ? (
                <DatasetManager 
                  datasets={datasets}
                  onImport={handleImport}
                  onRemove={handleRemove}
                  onPreview={(id) => {
                    setSelectedDatasetId(id);
                    setIsUploading(false);
                  }}
                />
              ) : selectedDatasetId && selectedDataset ? (
                <DataPreview dataset={selectedDataset} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
                  <p>Select a dataset from the sidebar to preview its contents.</p>
                </div>
              )}
            </main>

            <RightPanel currentView={currentView} suggestionsCount={suggestions.length} pendingCount={suggestions.filter(s => s.status === 'pending').length} />
          </>
        ) : currentView === 'relationships' ? (
          <>
            <RelationshipView datasets={datasets} suggestions={suggestions} setSuggestions={setSuggestions} />
            <RightPanel currentView={currentView} suggestionsCount={suggestions.length} pendingCount={suggestions.filter(s => s.status === 'pending').length} />
          </>
        ) : null}
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
