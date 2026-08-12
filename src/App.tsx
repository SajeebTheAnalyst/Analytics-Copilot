import { useState, useEffect } from 'react';
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

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashId, setSelectedDashId] = useState<string | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('data-manager');
  const [isUploading, setIsUploading] = useState(false);
  
  const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);

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
  );
}
