import { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { ErrorBoundary } from 'react-error-boundary';
import { TopNav } from './components/layout/TopNav';
import { Sidebar } from './components/layout/Sidebar';
import { RightPanel } from './components/layout/RightPanel';
import { DatasetManager } from './components/workspace/DatasetManager';
import { DataPreview } from './components/workspace/DataPreview';
import { RelationshipView } from './components/relationships/RelationshipView';
import { CleaningView } from './components/cleaning/CleaningView';
import { DashboardView } from './components/dashboards/DashboardView';
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
      <p className="text-zinc-500 mb-6 max-w-md">The application encountered an unexpected error. You can try refreshing the page or clearing the workspace.</p>
      <div className="flex gap-4">
        <button onClick={resetErrorBoundary} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Try Again</button>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Clear Workspace & Reload</button>
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
  
  const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);

  // Load from IDB on mount
  useEffect(() => {
    async function loadWorkspace() {
      try {
        const storedDatasets = await get('ac_datasets');
        const storedDashboards = await get('ac_dashboards');
        const storedSuggestions = await get('ac_suggestions');
        if (storedDatasets) setDatasets(storedDatasets);
        if (storedDashboards) setDashboards(storedDashboards);
        if (storedSuggestions) setSuggestions(storedSuggestions);
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
    // Generate IDs for widgets and dashboard
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

  // Run issue detection when datasets or relationships change
  // We use a custom hash of dataset row counts and update times to avoid deep comparison loops
  const dataFingerprint = datasets.map(d => `${d.id}-${d.rowCount}-${d.cleaningLogs?.length || 0}`).join('|');
  const suggestionsFingerprint = suggestions.map(s => `${s.id}-${s.status}`).join('|');

  useEffect(() => {
    if (datasets.length > 0) {
      setDatasets(prev => detectIssues(prev, suggestions));
    }
  }, [dataFingerprint, suggestionsFingerprint]);

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

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  if (!isInitialized) {
    return <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-950 text-zinc-500">Loading workspace...</div>;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
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

            <RightPanel 
              currentView={currentView} 
              datasets={datasets}
              suggestions={suggestions}
              dashboards={dashboards}
              onBuildDashboard={handleBuildDashboard}
            />
          </>
        ) : currentView === 'relationships' ? (
          <>
            <RelationshipView datasets={datasets} suggestions={suggestions} setSuggestions={setSuggestions} />
            <RightPanel 
              currentView={currentView} 
              datasets={datasets}
              suggestions={suggestions}
              dashboards={dashboards}
              onBuildDashboard={handleBuildDashboard}
            />
          </>
        ) : currentView === 'cleaning' ? (
          <>
            <CleaningView 
              datasets={datasets}
              onApplyIssue={handleApplyIssue}
              onRejectIssue={handleRejectIssue}
              onUndoLog={handleUndoLog}
              onApproveAllSafe={handleApproveAllSafe}
            />
            <RightPanel 
              currentView={currentView} 
              datasets={datasets}
              suggestions={suggestions}
              dashboards={dashboards}
              onBuildDashboard={handleBuildDashboard}
            />
          </>
        ) : currentView === 'dashboards' ? (
          <>
            <DashboardView 
              dashboards={dashboards} 
              datasets={datasets} 
              relationships={suggestions.filter(s => s.status === 'accepted')}
              selectedDashId={selectedDashId}
              onSelectDashboard={setSelectedDashId}
              onUpdateDashboard={(id, update) => setDashboards(prev => prev.map(d => d.id === id ? { ...d, ...update } : d))}
              onDeleteDashboard={(id) => {
                setDashboards(prev => prev.filter(d => d.id !== id));
                if (selectedDashId === id) setSelectedDashId(null);
              }}
            />
            <RightPanel 
              currentView={currentView} 
              datasets={datasets}
              suggestions={suggestions}
              dashboards={dashboards}
              activeDashboardId={selectedDashId}
              onBuildDashboard={handleBuildDashboard}
            />
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
    </ErrorBoundary>
  );
}
