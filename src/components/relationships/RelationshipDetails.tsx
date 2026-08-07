import React from 'react';
import { Dataset, RelationshipSuggestion } from '@/types';
import { X, Check, EyeOff, AlertTriangle, Link, Hash, CaseSensitive, Calendar, ToggleLeft, HelpCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface RelationshipDetailsProps {
  relationship: RelationshipSuggestion;
  sourceDataset: Dataset;
  targetDataset: Dataset;
  onClose: () => void;
  onStatusChange: (id: string, status: 'accepted' | 'rejected' | 'pending') => void;
}

export function RelationshipDetails({ relationship, sourceDataset, targetDataset, onClose, onStatusChange }: RelationshipDetailsProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'numeric': return <Hash className="w-3.5 h-3.5 text-blue-500" />;
      case 'boolean': return <ToggleLeft className="w-3.5 h-3.5 text-purple-500" />;
      case 'date': return <Calendar className="w-3.5 h-3.5 text-emerald-500" />;
      case 'categorical': return <CaseSensitive className="w-3.5 h-3.5 text-orange-500" />;
      default: return <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const srcProfile = sourceDataset.columnProfiles[relationship.sourceColumn];
  const tgtProfile = targetDataset.columnProfiles[relationship.targetColumn];

  return (
    <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] flex flex-col shrink-0 overflow-hidden shadow-2xl relative z-30">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/50">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Link className="w-4 h-4 text-blue-500" />
          Relationship Details
        </h3>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
        
        {/* Status indicator */}
        <div className={cn(
          "px-3 py-2 rounded-lg border flex items-center gap-2 text-sm font-medium",
          relationship.status === 'accepted' ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50" :
          relationship.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50" :
          "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900/50 dark:text-zinc-400 dark:border-zinc-800"
        )}>
          {relationship.status === 'accepted' && <Check className="w-4 h-4" />}
          {relationship.status === 'pending' && <AlertTriangle className="w-4 h-4" />}
          {relationship.status === 'rejected' && <EyeOff className="w-4 h-4" />}
          Status: <span className="capitalize">{relationship.status}</span>
        </div>

        {/* Tables & Columns mapped */}
        <div className="space-y-4 relative">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1">Source Table</div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{sourceDataset.name}</div>
            <div className="mt-2 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-100 dark:border-zinc-800/50">
              {getTypeIcon(srcProfile?.type)}
              <span className="truncate">{relationship.sourceColumn}</span>
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 flex items-center justify-center z-10 text-zinc-400">
            <Link className="w-4 h-4" />
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1">Target Table</div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{targetDataset.name}</div>
            <div className="mt-2 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-100 dark:border-zinc-800/50">
              {getTypeIcon(tgtProfile?.type)}
              <span className="truncate">{relationship.targetColumn}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-950">
            <div className="text-xs text-zinc-500 mb-1">Confidence</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{relationship.confidence}%</div>
          </div>
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-950">
            <div className="text-xs text-zinc-500 mb-1">Cardinality</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{relationship.type}</div>
          </div>
        </div>

        {/* Reasoning */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2 uppercase tracking-wide">Detection Reason</h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed bg-blue-50/50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
            {relationship.reason}
          </p>
        </div>

        {/* Warnings */}
        {relationship.warnings.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2 uppercase tracking-wide">Warnings</h4>
            <div className="space-y-2">
              {relationship.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Actions */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col gap-2 shrink-0">
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => onStatusChange(relationship.id, 'accepted')}
        >
          <Check className="w-4 h-4 mr-2" />
          Accept Relationship
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onStatusChange(relationship.id, 'rejected')}
          >
            <EyeOff className="w-4 h-4 mr-2 text-zinc-500" />
            Reject
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onStatusChange(relationship.id, 'pending')}
            disabled={relationship.status === 'pending'}
          >
            Ignore
          </Button>
        </div>
      </div>
    </div>
  );
}
