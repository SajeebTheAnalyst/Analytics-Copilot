import React, { useMemo } from 'react';
import { Dataset, RelationshipSuggestion } from '@/types';
import { evaluateModelIntegrity, ModelIntegrityReport } from '@/lib/modelIntegrityEngine';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  X, 
  ChevronRight, 
  ChevronDown, 
  Link, 
  Table,
  Network
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface ModelHealthPanelProps {
  datasets: Dataset[];
  suggestions: RelationshipSuggestion[];
  onReviewRelationship: (rel: RelationshipSuggestion) => void;
  onOpenDataset: (datasetId: string) => void;
  onCreateRelationship: () => void;
  onClose: () => void;
}

export function ModelHealthPanel({
  datasets,
  suggestions,
  onReviewRelationship,
  onOpenDataset,
  onCreateRelationship,
  onClose
}: ModelHealthPanelProps) {
  
  const report = useMemo(() => {
    return evaluateModelIntegrity(datasets, suggestions);
  }, [datasets, suggestions]);

  const getStatusBanner = () => {
    switch (report.status) {
      case 'READY':
        return {
          bg: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
          label: 'Model Ready'
        };
      case 'NEEDS_ATTENTION':
        return {
          bg: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
          label: 'Attention Required'
        };
      default:
        return {
          bg: 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-300',
          icon: <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />,
          label: 'Model Blocked'
        };
    }
  };

  const banner = getStatusBanner();

  return (
    <div className="w-96 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] flex flex-col shrink-0 overflow-hidden shadow-2xl relative z-40 h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/50">
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Network className="w-4 h-4 text-blue-500" />
          Model Integrity
        </h3>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Status Score */}
        <div className={cn("p-4 rounded-xl border flex items-center gap-3", banner.bg)}>
          {banner.icon}
          <div>
            <div className="font-black text-sm">{banner.label}</div>
            <div className="text-xs font-bold opacity-80">Model Score: {report.overallScore}/100</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-150 dark:border-zinc-850">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Datasets</div>
            <div className="text-lg font-black">{report.activeDatasetCount}</div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-150 dark:border-zinc-850">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Relations</div>
            <div className="text-lg font-black">{report.activeRelationshipCount}</div>
          </div>
        </div>

        {/* Issues List */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Integrity Issues ({report.issues.length})</h4>
          {report.issues.length === 0 && (
            <div className="p-4 text-center text-xs text-zinc-500 italic bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">No integrity issues found.</div>
          )}
          
          {report.issues.map(issue => (
            <div key={issue.id} className={cn("p-3 rounded-lg border text-xs", 
              issue.type === 'critical' ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-900 dark:text-red-200' :
              issue.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200' :
              'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-200'
            )}>
              <div className="font-bold mb-1 flex items-center gap-2">
                {issue.type === 'critical' ? <ShieldAlert className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {issue.whatIsWrong}
              </div>
              <div className="opacity-90 mb-2 leading-relaxed">{issue.whyMatters}</div>
              <div className="font-medium text-[10px] uppercase opacity-70 mb-1">Where: {issue.where}</div>
              
              <div className="flex gap-2 mt-2">
                {issue.relId && <Button size="sm" variant="secondary" className="h-6 text-[10px]" onClick={() => onReviewRelationship(suggestions.find(r => r.id === issue.relId)!)}>Review</Button>}
                {issue.datasetId && <Button size="sm" variant="secondary" className="h-6 text-[10px]" onClick={() => onOpenDataset(issue.datasetId!)}>Open Table</Button>}
              </div>
            </div>
          ))}

          {/* Disconnected Datasets */}
          {report.disconnectedDatasets.length > 0 && (
             <div className="p-3 rounded-lg border bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
               <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2">
                 <Info className="w-3.5 h-3.5 text-zinc-400" />
                 Disconnected Dataset{report.disconnectedDatasets.length > 1 ? 's' : ''}
               </div>
               <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-snug">
                 {report.disconnectedDatasets.length} dataset{report.disconnectedDatasets.length > 1 ? 's are' : ' is'} not connected to the main analytical model.
               </p>
               <Button size="sm" variant="ghost" className="text-[10px] h-6 px-0 mt-1" onClick={onCreateRelationship}>Create a relationship</Button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
