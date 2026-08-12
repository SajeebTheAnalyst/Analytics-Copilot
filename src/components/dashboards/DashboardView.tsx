import React, { useState } from 'react';
import { Dashboard, Dataset, RelationshipSuggestion, DashboardFilter, WidgetConfig } from '@/types';
import { WidgetRenderer } from './WidgetRenderer';
import { LayoutDashboard, Plus, Trash2, Edit3, Settings, Filter, FileText, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface DashboardViewProps {
  dashboards: Dashboard[];
  datasets: Dataset[];
  relationships: RelationshipSuggestion[];
  selectedDashId: string | null;
  onSelectDashboard: (id: string | null) => void;
  onUpdateDashboard: (id: string, updates: Partial<Dashboard>) => void;
  onDeleteDashboard: (id: string) => void;
}

export function DashboardView({ dashboards, datasets, relationships, selectedDashId, onSelectDashboard, onUpdateDashboard, onDeleteDashboard }: DashboardViewProps) {
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  if (dashboards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-[#050505]">
        <LayoutDashboard className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">No Dashboards Yet</h2>
        <p className="text-zinc-500 mt-2 max-w-md text-center mb-6">
          Ask the AI Copilot to build a dashboard for you (e.g. "Build a sales dashboard") or click Create below to start from scratch.
        </p>
        {datasets.length > 0 && (
          <Button 
            onClick={() => {
              const newDash: Dashboard = {
                id: `dash-${Date.now()}`,
                title: 'My Custom Dashboard',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                widgets: [],
                filters: []
              };
              onUpdateDashboard(newDash.id, newDash);
              onSelectDashboard(newDash.id);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Blank Dashboard
          </Button>
        )}
      </div>
    );
  }

  const selectedDash = dashboards.find(d => d.id === selectedDashId) || dashboards[0];
  
  // Set default selection if none
  if (!selectedDashId && dashboards.length > 0) {
    onSelectDashboard(dashboards[0].id);
  }

  const handleFilterChange = (datasetId: string, column: string, value: string | null) => {
    const newFilters = [...(selectedDash.filters || [])];
    const existingIndex = newFilters.findIndex(f => f.datasetId === datasetId && f.column === column);
    
    if (value === null || value === 'all' || value === '') {
      if (existingIndex >= 0) newFilters.splice(existingIndex, 1);
    } else {
      if (existingIndex >= 0) {
        newFilters[existingIndex].value = value;
      } else {
        newFilters.push({ id: Date.now().toString(), datasetId, column, value });
      }
    }
    
    onUpdateDashboard(selectedDash.id, { filters: newFilters, updatedAt: Date.now() });
  };

  const handleSaveTitle = () => {
    if (titleInput.trim()) {
      onUpdateDashboard(selectedDash.id, { title: titleInput.trim(), updatedAt: Date.now() });
    }
    setIsEditingTitle(false);
  };

  const handleRemoveWidget = (widgetId: string) => {
    const newWidgets = selectedDash.widgets.filter(w => w.id !== widgetId);
    onUpdateDashboard(selectedDash.id, { widgets: newWidgets, updatedAt: Date.now() });
  };

  const handleCreateNewDashboard = () => {
    const newId = `dash-${Date.now()}`;
    const newDash: Dashboard = {
      id: newId,
      title: `Dashboard ${dashboards.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      widgets: [],
      filters: []
    };
    onUpdateDashboard(newId, newDash);
    onSelectDashboard(newId);
  };

  // Find categorical columns available for filtering across dashboard datasets
  const dashboardDatasetIds = new Set(selectedDash.widgets.map(w => w.datasetId));
  const filterableDatasets = datasets.filter(d => dashboardDatasetIds.has(d.id) || dashboardDatasetIds.has(d.name));

  const kpis = selectedDash.widgets.filter(w => w.type === 'kpi');
  const charts = selectedDash.widgets.filter(w => w.type !== 'kpi');

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Dashboards</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={handleCreateNewDashboard} title="Create New Dashboard">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {dashboards.map(dash => (
            <button
              key={dash.id}
              onClick={() => onSelectDashboard(dash.id)}
              className={cn(
                "w-full flex items-center justify-between p-2 rounded-lg text-sm transition-all text-left group",
                selectedDashId === dash.id 
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium" 
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              )}
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span className="truncate">{dash.title}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-6 h-6 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteDashboard(dash.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-50/50 dark:bg-[#050505] overflow-y-auto custom-scrollbar">
        {selectedDash && (
          <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={titleInput} 
                      onChange={(e) => setTitleInput(e.target.value)}
                      className="text-2xl font-bold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    />
                    <Button size="icon" variant="ghost" onClick={handleSaveTitle} className="text-emerald-500">
                      <Check className="w-5 h-5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)} className="text-zinc-400">
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                ) : (
                  <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    {selectedDash.title}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-7 h-7 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      onClick={() => {
                        setTitleInput(selectedDash.title);
                        setIsEditingTitle(true);
                      }}
                      title="Edit Title"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </h1>
                )}
                <p className="text-sm text-zinc-500 mt-1">Last updated {new Date(selectedDash.updatedAt).toLocaleString()}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant={showFilterBar ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setShowFilterBar(!showFilterBar)}
                  className={showFilterBar ? "bg-blue-600 text-white" : "bg-white dark:bg-zinc-900"}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters {selectedDash.filters.length > 0 && `(${selectedDash.filters.length})`}
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            {showFilterBar && (
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center gap-4">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-500" />
                  Active Filters:
                </span>
                {filterableDatasets.length === 0 ? (
                  <span className="text-xs text-zinc-400 italic">No datasets connected to this dashboard yet.</span>
                ) : (
                  filterableDatasets.map(dataset => {
                    const categoricalCols = Object.entries(dataset.columnProfiles)
                      .filter(([_, prof]) => prof.type === 'categorical' || prof.type === 'boolean' || prof.uniqueCount <= 30)
                      .map(([col]) => col);

                    return categoricalCols.map(col => {
                      const sourceData = dataset.fullData || dataset.data;
                      const uniqueVals = Array.from(new Set(sourceData.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== ''))).slice(0, 50);
                      const currentFilter = selectedDash.filters.find(f => (f.datasetId === dataset.id || f.datasetId === dataset.name) && f.column === col);

                      return (
                        <div key={`${dataset.id}-${col}`} className="flex items-center gap-2">
                          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            {col}:
                          </label>
                          <select
                            value={currentFilter?.value ?? 'all'}
                            onChange={(e) => handleFilterChange(dataset.id, col, e.target.value)}
                            className="text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="all">All</option>
                            {uniqueVals.map(val => (
                              <option key={String(val)} value={String(val)}>{String(val)}</option>
                            ))}
                          </select>
                        </div>
                      );
                    });
                  })
                )}
                {selectedDash.filters.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onUpdateDashboard(selectedDash.id, { filters: [], updatedAt: Date.now() })}
                    className="text-xs text-red-500 hover:text-red-600 ml-auto"
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            )}

            {/* KPIs */}
            {kpis.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map(widget => (
                  <div key={widget.id} className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between group relative">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-zinc-500">{widget.title}</h3>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-6 h-6 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity"
                        onClick={() => handleRemoveWidget(widget.id)}
                        title="Remove Widget"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="mt-2 h-10">
                      <WidgetRenderer widget={widget} datasets={datasets} relationships={relationships} filters={selectedDash.filters} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Charts */}
            {charts.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {charts.map(widget => (
                  <div key={widget.id} className={cn(
                    "bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-96 group relative",
                    widget.type === 'table' ? "lg:col-span-2" : ""
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{widget.title}</h3>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-7 h-7 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity"
                        onClick={() => handleRemoveWidget(widget.id)}
                        title="Remove Widget"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex-1 min-h-0">
                      <WidgetRenderer widget={widget} datasets={datasets} relationships={relationships} filters={selectedDash.filters} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedDash.widgets.length === 0 && (
              <div className="p-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center">
                <LayoutDashboard className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Empty Dashboard</h3>
                <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
                  Ask the AI Copilot to generate charts for your imported datasets!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
