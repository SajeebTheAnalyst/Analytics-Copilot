import React from 'react';
import { Dataset, RelationshipSuggestion } from '@/types';
import { Sparkles, Check, X, Eye, HelpCircle, AlertTriangle, ArrowRight, Table, Fingerprint } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface RelationshipSuggestionsProps {
  suggestions: RelationshipSuggestion[];
  datasets: Dataset[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onReview: (suggestion: RelationshipSuggestion) => void;
  className?: string;
}

export function RelationshipSuggestions({
  suggestions,
  datasets,
  onAccept,
  onDismiss,
  onReview,
  className
}: RelationshipSuggestionsProps) {
  const pendingSuggestions = React.useMemo(() => {
    return suggestions.filter(s => s.status === 'pending');
  }, [suggestions]);

  const getDatasetName = (id: string) => {
    return datasets.find(d => d.id === id)?.name || id;
  };

  const getCardinalityLabel = (type: string) => {
    switch (type) {
      case '1:1': return 'One-to-One';
      case '1:N': return 'One-to-Many';
      case 'N:1': return 'Many-to-One';
      case 'N:M': return 'Many-to-Many';
      default: return type;
    }
  };

  return (
    <div className={cn("flex flex-col bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm", className)}>
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Discovered Suggestions</h3>
            <p className="text-[11px] text-zinc-500">Auto-detected relationships based on schema & data alignment</p>
          </div>
        </div>
        <span className="text-xs bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold">
          {pendingSuggestions.length} Found
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 max-h-[550px]">
        {pendingSuggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 text-zinc-400 mb-3">
              <Fingerprint className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
            </div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1">No New Suggestions</h4>
            <p className="text-[11px] text-zinc-500 max-w-[200px]">
              All discovered relationships have been reviewed. Import more datasets or clean existing data to uncover connections.
            </p>
          </div>
        ) : (
          pendingSuggestions.map((s) => {
            const srcName = getDatasetName(s.sourceDatasetId);
            const tgtName = getDatasetName(s.targetDatasetId);

            // Determine health/confidence color
            let confColor = 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30';
            if (s.confidence >= 80) {
              confColor = 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30';
            } else if (s.confidence >= 60) {
              confColor = 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30';
            }

            return (
              <div 
                key={s.id} 
                className="group border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3.5 bg-zinc-50/20 dark:bg-zinc-950/10 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 shadow-2xs"
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded-md tracking-wider uppercase font-mono", confColor)}>
                    {s.confidence}% Confidence
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md">
                    {getCardinalityLabel(s.type)}
                  </span>
                </div>

                {/* Connection Details */}
                <div className="space-y-1.5 mb-3 bg-white dark:bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-900">
                  {/* Source */}
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Table className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{srcName}</span>
                    <span className="text-[10px] font-mono text-zinc-500 truncate bg-zinc-100/60 dark:bg-zinc-800 px-1.5 py-0.2 rounded">.{s.sourceColumn}</span>
                  </div>

                  {/* Indicator Arrow */}
                  <div className="pl-5 text-zinc-400 flex items-center">
                    <div className="w-0.5 h-3 bg-zinc-200 dark:bg-zinc-800 ml-1"></div>
                  </div>

                  {/* Target */}
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Table className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">{tgtName}</span>
                    <span className="text-[10px] font-mono text-zinc-500 truncate bg-zinc-100/60 dark:bg-zinc-800 px-1.5 py-0.2 rounded">.{s.targetColumn}</span>
                  </div>
                </div>

                {/* Subtitle / Description */}
                <div className="mb-4">
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                    {s.reason}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onReview(s)}
                    className="h-8 flex-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 gap-1.5 cursor-pointer font-medium"
                  >
                    <Eye className="w-3.5 h-3.5 text-zinc-500" />
                    Review
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onDismiss(s.id)}
                    className="h-8 flex-1 text-xs border-zinc-200 dark:border-zinc-800 text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 gap-1.5 cursor-pointer font-medium"
                  >
                    <X className="w-3.5 h-3.5" />
                    Dismiss
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => onAccept(s.id)}
                    className="h-8 flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 cursor-pointer font-medium"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
