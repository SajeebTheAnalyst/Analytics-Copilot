import { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { ErrorBoundary } from 'react-error-boundary';
import { motion, AnimatePresence } from 'motion/react';
import { TopNav } from './components/layout/TopNav';
import { Sidebar } from './components/layout/Sidebar';
import { RightPanel } from './components/layout/RightPanel';
import { DatasetManager } from './components/workspace/DatasetManager';
import { DataExplorer } from './components/explorer/DataExplorer';
import { RelationshipView } from './components/relationships/RelationshipView';
import { CleaningView } from './components/cleaning/CleaningView';
import { DashboardView } from './components/dashboards/DashboardView';
import { KpiBuilderView } from './components/analysis/KpiBuilderView';
import { MisReportView } from './components/reporting/MisReportView';
import { DataDictionaryView } from './components/assets/DataDictionaryView';
import { RenameModal } from './components/workspace/RenameModal';

import { Dataset, ViewState, RelationshipSuggestion, Dashboard, DashboardPlan } from '@/types';
import { detectRelationships } from '@/lib/relationshipDetector';
import { detectIssues, applyCleaningAction, undoCleaningAction, restoreOriginal } from '@/lib/dataCleaner';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-zinc-950 text-center text-zinc-900 dark:text-zinc-50">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-zinc-500 mb-6 max-w-md font-sans text-xs">The application encountered an unexpected error. You can try refreshing the page or clearing the workspace.</p>
      <div className="flex gap-4">
        <button onClick={resetErrorBoundary} className="px-4 py-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Try Again</button>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-4 py-2 bg-red-600 text-white rounded text-xs hover:bg-red-700">Clear Workspace & Reload</button>
      </div>
    </div>
  );
}

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashId, setSelectedDashId] = useState<string | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('data-manager');
  const [isUploading, setIsUploading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Shell UX States
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [renamingDatasetId, setRenamingDatasetId] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);

  // Auto-select first dataset if none selected
  useEffect(() => {
    if (datasets.length > 0 && !selectedDatasetId) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [datasets, selectedDatasetId]);

  // Load from IDB on mount
  useEffect(() => {
    async function loadWorkspace() {
      try {
        const storedDatasets = await get('ac_datasets');
        const storedDashboards = await get('ac_dashboards');
        const storedSuggestions = await get('ac_suggestions');
        if (storedDatasets && Array.isArray(storedDatasets)) setDatasets(storedDatasets);
        if (storedDashboards && Array.isArray(storedDashboards)) setDashboards(storedDashboards);
        if (storedSuggestions && Array.isArray(storedSuggestions)) setSuggestions(storedSuggestions);
      } catch (err) {
        console.error("Failed to load workspace from IndexedDB", err);
      } finally {
        setIsInitialized(true);
      }
    }
    loadWorkspace();
  }, []);

  // Save to IDB on change
  useEffect(() => {
    if (!isInitialized) return;
    set('ac_datasets', datasets).catch(console.error);
  }, [datasets, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    set('ac_dashboards', dashboards).catch(console.error);
  }, [dashboards, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    set('ac_suggestions', suggestions).catch(console.error);
  }, [suggestions, isInitialized]);

  const handleBuildDashboard = (plan: DashboardPlan) => {
    const newId = `dash-${Date.now()}`;
    const newDashboard: Dashboard = {
      id: newId,
      title: plan.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      widgets: [
        ...plan.kpis.map((kpi, i) => ({
          ...kpi,
          id: `widget-kpi-${Date.now()}-${i}`,
          type: 'kpi' as const
        })),
        ...plan.charts.map((chart, i) => ({
          ...chart,
          id: `widget-chart-${Date.now()}-${i}`,
          type: chart.type || 'line'
        }))
      ],
      filters: []
    };
    
    setDashboards(prev => [...prev, newDashboard]);
    setSelectedDashId(newId);
    setCurrentView('dashboards');
  };

  useEffect(() => {
    const newSuggestions = detectRelationships(datasets);
    setSuggestions(prev => {
      const existing = new Map<string, RelationshipSuggestion>(prev.map(p => [p.id, p]));
      return newSuggestions.map(ns => {
        const ext = existing.get(ns.id);
        if (ext) return { ...ns, status: ext.status };
        return ns;
      });
    });
  }, [datasets]);

  const dataFingerprint = datasets.map(d => `${d.id}-${d.rowCount}-${d.cleaningLogs?.length || 0}`).join('|');
  const suggestionsFingerprint = suggestions.map(s => `${s.id}-${s.status}`).join('|');

  useEffect(() => {
    if (datasets.length > 0) {
      setDatasets(prev => detectIssues(prev, suggestions));
    }
  }, [dataFingerprint, suggestionsFingerprint]);

  const handleImport = (newDatasets: Dataset[]) => {
    setDatasets(prev => [...prev, ...newDatasets]);
    if (newDatasets.length > 0) {
      setSelectedDatasetId(newDatasets[0].id);
    }
    setIsUploading(false);
  };

  const handleRemove = (id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
    if (selectedDatasetId === id) {
      const remaining = datasets.filter(d => d.id !== id);
      setSelectedDatasetId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleSaveDatasetName = (id: string, newName: string) => {
    setDatasets(prev => prev.map(d => d.id === id ? { ...d, name: newName } : d));
  };

  const handleApplyIssue = (datasetId: string, issueId: string) => {
    setDatasets(prev => prev.map(d => d.id === datasetId ? applyCleaningAction(d, issueId) : d));
  };

  const handleRejectIssue = (datasetId: string, issueId: string) => {
    setDatasets(prev => prev.map(d => {
      if (d.id === datasetId) {
        return {
          ...d,
          issues: (d.issues || []).map(i => i.id === issueId ? { ...i, status: 'rejected' } : i)
        };
      }
      return d;
    }));
  };

  const handleUndoLog = (datasetId: string, logId: string) => {
    setDatasets(prev => prev.map(d => {
      if (d.id === datasetId) {
        if (logId === 'RESTORE_ALL') {
          return restoreOriginal(d);
        }
        return undoCleaningAction(d, logId);
      }
      return d;
    }));
  };

  const handleApproveAllSafe = (datasetId: string) => {
    setDatasets(prev => prev.map(d => {
      if (d.id === datasetId) {
        let currentDataset = d;
        const safeIssues = (currentDataset.issues || []).filter(i => i.status === 'pending' && i.riskLevel === 'low');
        for (const issue of safeIssues) {
          currentDataset = applyCleaningAction(currentDataset, issue.id);
        }
        return currentDataset;
      }
      return d;
    }));
  };

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId) || datasets[0];
  const renamingTargetDataset = datasets.find(d => d.id === renamingDatasetId) || null;

  if (!isInitialized) {
    return <div className="h-full flex items-center justify-center bg-white dark:bg-[#050505] text-zinc-500 text-xs font-mono">Loading workspace session...</div>;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <div className="h-[100dvh] flex flex-col ambient-bg text-zinc-900 dark:text-zinc-50 font-sans selection:bg-blue-200 dark:selection:bg-blue-900/50 overflow-hidden">
        
        {/* Top Header Navigation */}
        <TopNav 
          currentView={currentView} 
          onViewChange={setCurrentView} 
          onImportFiles={() => {
            setIsUploading(true);
            setCurrentView('data-manager');
          }}
          datasets={datasets}
          selectedDatasetId={selectedDatasetId}
          onSelectDataset={setSelectedDatasetId}
          onToggleCopilot={() => setIsCopilotOpen(!isCopilotOpen)}
          isCopilotOpen={isCopilotOpen}
        />

        {/* Workspace Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          
          {/* Global Sidebar Navigation */}
          <Sidebar 
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelectDataset={(id) => {
              setSelectedDatasetId(id);
              setIsUploading(false);
            }}
            onRemoveDataset={handleRemove}
            onRenameDataset={(id) => setRenamingDatasetId(id)}
            currentView={currentView}
            onViewChange={setCurrentView}
            onToggleCopilot={() => setIsCopilotOpen(!isCopilotOpen)}
            isCopilotOpen={isCopilotOpen}
          />

          {/* Main View Router Container */}
          <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar bg-transparent relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="min-h-full flex flex-col"
              >
                {currentView === 'data-manager' ? (
                  <DatasetManager 
                    datasets={datasets}
                    selectedDatasetId={selectedDatasetId}
                    onSelectDataset={(id) => {
                      setSelectedDatasetId(id);
                      setIsUploading(false);
                    }}
                    onImport={handleImport}
                    onRemove={handleRemove}
                    onRename={(id) => setRenamingDatasetId(id)}
                    onNavigateView={(view) => setCurrentView(view)}
                    onUpdateDataset={(updated) => setDatasets(prev => prev.map(d => d.id === updated.id ? updated : d))}
                  />
                ) : currentView === 'cleaning' ? (
                  <CleaningView 
                    datasets={datasets}
                    onApplyIssue={handleApplyIssue}
                    onRejectIssue={handleRejectIssue}
                    onUndoLog={handleUndoLog}
                    onApproveAllSafe={handleApproveAllSafe}
                    onUpdateDataset={(updated) => setDatasets(prev => prev.map(d => d.id === updated.id ? updated : d))}
                  />
                ) : currentView === 'explorer' ? (
                  <DataExplorer 
                    dataset={selectedDataset} 
                    allDatasets={datasets}
                    onSelectDataset={setSelectedDatasetId}
                    onNavigateView={(view) => setCurrentView(view)}
                  />
                ) : currentView === 'relationships' ? (
                  <RelationshipView datasets={datasets} suggestions={suggestions} setSuggestions={setSuggestions} />
                ) : currentView === 'kpi-builder' ? (
                  <KpiBuilderView 
                    datasets={datasets} 
                    selectedDatasetId={selectedDatasetId || undefined}
                    onNavigateView={(view) => setCurrentView(view)}
                  />
                ) : currentView === 'dashboards' ? (
                  <DashboardView 
                    dashboards={dashboards} 
                    datasets={datasets} 
                    relationships={suggestions.filter(s => s.status === 'accepted')}
                    selectedDashId={selectedDashId}
                    selectedDatasetId={selectedDatasetId}
                    onSelectDataset={setSelectedDatasetId}
                    onSelectDashboard={setSelectedDashId}
                    onUpdateDashboard={(id, update) => {
                      setDashboards(prev => {
                        const exists = prev.some(d => d.id === id);
                        if (exists) {
                          return prev.map(d => d.id === id ? { ...d, ...update } : d);
                        } else {
                          const newDash: Dashboard = {
                            id,
                            title: update.title || 'New Dashboard',
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            widgets: update.widgets || [],
                            filters: update.filters || [],
                            ...update
                          };
                          return [newDash, ...prev];
                        }
                      });
                    }}
                    onDeleteDashboard={(id) => {
                      setDashboards(prev => prev.filter(d => d.id !== id));
                      if (selectedDashId === id) setSelectedDashId(null);
                    }}
                  />
                ) : currentView === 'mis-report' ? (
                  <MisReportView datasets={datasets} dashboards={dashboards} />
                ) : currentView === 'data-dictionary' ? (
                  <DataDictionaryView datasets={datasets} dashboards={dashboards} />
                ) : null}
              </motion.div>
            </AnimatePresence>
          </main>
          
          {/* Collapsible AI Copilot Panel */}
          <RightPanel 
            isOpen={isCopilotOpen}
            onClose={() => setIsCopilotOpen(false)}
            currentView={currentView} 
            onViewChange={setCurrentView}
            datasets={datasets}
            suggestions={suggestions}
            dashboards={dashboards}
            activeDashboardId={selectedDashId}
            onBuildDashboard={handleBuildDashboard}
            onUpdateDataset={(updated) => setDatasets(prev => prev.map(d => d.id === updated.id ? updated : d))}
          />
        </div>

        {/* Dataset Rename Modal */}
        <RenameModal 
          isOpen={renamingDatasetId !== null}
          dataset={renamingTargetDataset}
          onClose={() => setRenamingDatasetId(null)}
          onSave={handleSaveDatasetName}
        />

        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 10px; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a1a1aa; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
        `}</style>
      </div>
    </ErrorBoundary>
  );
}
