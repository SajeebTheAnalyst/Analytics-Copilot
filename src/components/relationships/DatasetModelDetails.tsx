import React, { useMemo } from 'react';
import { Dataset, RelationshipSuggestion } from '@/types';
import { X, Table, ShieldCheck, ShieldAlert, AlertTriangle, ArrowRight, Activity, Rows, Columns, Link } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { evaluateDataReadiness } from '@/lib/dataReadinessEngine';

interface DatasetModelDetailsProps {
  dataset: Dataset;
  onClose: () => void;
  onOpenDataset: (id: string) => void;
  activeRelationships: RelationshipSuggestion[];
}

export function DatasetModelDetails({
  dataset,
  onClose,
  onOpenDataset,
  activeRelationships
}: DatasetModelDetailsProps) {
  // Compute data quality/readiness state
  const readiness = useMemo(() => {
    return evaluateDataReadiness(dataset);
  }, [dataset]);

  // Count relationships connected to this dataset
  const relCount = useMemo(() => {
    return activeRelationships.filter(r => 
      (r.sourceDatasetId === dataset.id || r.targetDatasetId === dataset.id) && 
      r.status === 'accepted'
    ).length;
  }, [activeRelationships, dataset.id]);

  const getReadinessBanner = () => {
    switch (readiness.status) {
      case 'READY':
        return {
          bg: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          label: 'Ready for Analysis'
        };
      case 'NEEDS_CLEANING':
        return {
          bg: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          label: 'Needs Data Cleaning'
        };
      default:
        return {
          bg: 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-300',
          icon: <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 animate-pulse" />,
          label: 'Model Blocked'
        };
    }
  };

  const banner = getReadinessBanner();

  return (
    <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] flex flex-col shrink-0 overflow-hidden shadow-2xl relative z-30">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/50">
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Table className="w-4 h-4 text-blue-500" />
          Table Properties
        </h3>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        
        {/* Dataset Header Name */}
        <div className="space-y-1">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate" title={dataset.name}>
            {dataset.name}
          </h2>
          <p className="text-[11px] font-mono text-zinc-400 truncate bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded border border-zinc-150/40 dark:border-zinc-800/40">
            {dataset.filename || 'Imported source'}
          </p>
        </div>

        {/* Readiness State Indicator */}
        <div className={cn("p-3 rounded-xl border flex flex-col gap-2 shadow-2xs", banner.bg)}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1.5">
              {banner.icon}
              {banner.label}
            </span>
            <span className="text-xs font-extrabold">{readiness.qualityScore}% Quality</span>
          </div>
          <p className="text-[11px] opacity-90 leading-relaxed font-medium">
            {readiness.summaryMessage || 'Data properties meet reporting models guidelines.'}
          </p>
        </div>

        {/* Column Profiling Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="border border-zinc-150 dark:border-zinc-850 rounded-xl p-3 bg-zinc-50/20 dark:bg-zinc-950/20 flex flex-col gap-1">
            <div className="flex items-center gap-1 text-zinc-400">
              <Rows className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Rows</span>
            </div>
            <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
              {dataset.rowCount.toLocaleString()}
            </span>
          </div>

          <div className="border border-zinc-150 dark:border-zinc-850 rounded-xl p-3 bg-zinc-50/20 dark:bg-zinc-950/20 flex flex-col gap-1">
            <div className="flex items-center gap-1 text-zinc-400">
              <Columns className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Cols</span>
            </div>
            <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
              {dataset.colCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Active Link statistics */}
        <div className="border border-zinc-150 dark:border-zinc-850 rounded-xl p-3.5 bg-zinc-50/10 dark:bg-zinc-950/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
              <Link className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200">Active Links</span>
              <span className="text-[10px] text-zinc-500">Connected relations in layout</span>
            </div>
          </div>
          <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
            {relCount}
          </span>
        </div>

        {/* Column Types Summary list */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data Types Alignment</h4>
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar border border-zinc-150 dark:border-zinc-850 rounded-xl bg-white dark:bg-zinc-950 divide-y divide-zinc-100 dark:divide-zinc-900">
            {dataset.headers.map(header => {
              const prof = dataset.columnProfiles?.[header];
              const type = prof?.type || 'text';
              return (
                <div key={header} className="flex items-center justify-between py-2 px-3 text-xs">
                  <span className="font-mono truncate max-w-[150px] text-zinc-700 dark:text-zinc-300" title={header}>
                    {header}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 shrink-0 bg-zinc-100/50 dark:bg-zinc-900/50 px-1.5 py-0.5 rounded">
                    {type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 shrink-0">
        <Button
          onClick={() => onOpenDataset(dataset.id)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 gap-1.5 cursor-pointer shadow-sm rounded-lg"
        >
          Open Dataset
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
