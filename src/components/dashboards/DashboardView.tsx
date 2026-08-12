import React, { useState } from 'react';
import { Dashboard, Dataset, RelationshipSuggestion, DashboardFilter } from '@/types';
import { WidgetRenderer } from './WidgetRenderer';
import { LayoutDashboard, Plus, Trash2, Edit3, Settings, Filter, FileText } from 'lucide-react';
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
  if (dashboards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-[#050505]">
        <LayoutDashboard className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">No Dashboards Yet</h2>
        <p className="text-zinc-500 mt-2 max-w-md text-center">
          Ask the AI Copilot to build a dashboard for you (e.g. "Build a sales dashboard") or click Create below to start from scratch.
        </p>
      </div>
    );
  }

  const selectedDash = dashboards.find(d => d.id === selectedDashId) || dashboards[0];
  
  // Set default selection if none
  if (!selectedDashId && dashboards.length > 0) {
    onSelectDashboard(dashboards[0].id);
  }

  const handleFilterChange = (datasetId: string, column: string, value: string | null) => {
    const newFilters = [...selectedDash.filters];
    const existingIndex = newFilters.findIndex(f => f.datasetId === datasetId && f.column === column);
    
    if (value === null) {
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

  const kpis = selectedDash.widgets.filter(w => w.type === 'kpi');
  const charts = selectedDash.widgets.filter(w => w.type !== 'kpi');

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Dashboards</h3>
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
          <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{selectedDash.title}</h1>
                <p className="text-sm text-zinc-500 mt-1">Last updated {new Date(selectedDash.updatedAt).toLocaleString()}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="bg-white dark:bg-zinc-900">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
                <Button variant="outline" size="sm" className="bg-white dark:bg-zinc-900">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Dashboard
                </Button>
              </div>
            </div>

            {/* KPIs */}
            {kpis.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map(widget => (
                  <div key={widget.id} className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between group">
                    <h3 className="text-sm font-medium text-zinc-500">{widget.title}</h3>
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
                    "bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-96 group",
                    widget.type === 'table' ? "lg:col-span-2" : ""
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{widget.title}</h3>
                      <Button variant="ghost" size="icon" className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Settings className="w-4 h-4 text-zinc-400" />
                      </Button>
                    </div>
                    <div className="flex-1 min-h-0">
                      <WidgetRenderer widget={widget} datasets={datasets} relationships={relationships} filters={selectedDash.filters} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
