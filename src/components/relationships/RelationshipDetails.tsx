import React, { useState, useMemo } from 'react';
import { Dataset, RelationshipSuggestion } from '@/types';
import { X, Check, EyeOff, AlertTriangle, Link, Hash, CaseSensitive, Calendar, ToggleLeft, HelpCircle, Edit2, Trash2, ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { validateRelationship } from '@/lib/relationshipDiscovery';

interface RelationshipDetailsProps {
  relationship: RelationshipSuggestion;
  sourceDataset: Dataset;
  targetDataset: Dataset;
  onClose: () => void;
  onStatusChange: (id: string, status: 'accepted' | 'rejected' | 'pending') => void;
  onUpdate?: (id: string, updated: Partial<RelationshipSuggestion>) => void;
  onDelete?: (id: string) => void;
  datasets: Dataset[];
}

export function RelationshipDetails({ 
  relationship, 
  sourceDataset, 
  targetDataset, 
  onClose, 
  onStatusChange,
  onUpdate,
  onDelete,
  datasets
}: RelationshipDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Edit fields state
  const [editSourceCol, setEditSourceCol] = useState(relationship.sourceColumn);
  const [editTargetCol, setEditTargetCol] = useState(relationship.targetColumn);
  const [editCardinality, setEditCardinality] = useState(relationship.type);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'numeric': return <Hash className="w-3.5 h-3.5 text-blue-500" />;
      case 'boolean': return <ToggleLeft className="w-3.5 h-3.5 text-purple-500" />;
      case 'date': return <Calendar className="w-3.5 h-3.5 text-emerald-500" />;
      case 'categorical': return <CaseSensitive className="w-3.5 h-3.5 text-orange-500" />;
      default: return <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const srcProfile = sourceDataset?.columnProfiles?.[relationship.sourceColumn];
  const tgtProfile = targetDataset?.columnProfiles?.[relationship.targetColumn];

  // Dynamic live validation stats for current settings or edit settings
  const activeValidation = useMemo(() => {
    if (!sourceDataset || !targetDataset) return null;
    const colSrc = isEditing ? editSourceCol : relationship.sourceColumn;
    const colTgt = isEditing ? editTargetCol : relationship.targetColumn;
    const card = isEditing ? editCardinality : relationship.type;

    return validateRelationship(sourceDataset, colSrc, targetDataset, colTgt, card);
  }, [isEditing, editSourceCol, editTargetCol, editCardinality, sourceDataset, targetDataset, relationship]);

  const handleSaveEdit = () => {
    if (!activeValidation) return;
    if (!activeValidation.isValid) return; // do not save invalid

    if (onUpdate) {
      onUpdate(relationship.id, {
        sourceColumn: editSourceCol,
        targetColumn: editTargetCol,
        type: editCardinality,
        warnings: activeValidation.warnings,
        reason: `Manually defined key connection. ${activeValidation.stats.overlapPct}% values align perfectly.`
      });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(relationship.id);
    }
    setIsConfirmingDelete(false);
    onClose();
  };

  const isCurrentActive = relationship.status === 'accepted';

  return (
    <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] flex flex-col shrink-0 overflow-hidden shadow-2xl relative z-30">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/50">
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Link className="w-4 h-4 text-blue-500" />
          {isEditing ? "Edit Relationship" : "Relationship Details"}
        </h3>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        
        {/* Status indicator: clearly distinguish Active vs Suggested */}
        <div className={cn(
          "px-3 py-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-2xs",
          isCurrentActive 
            ? "bg-emerald-50/50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800/40" 
            : "bg-blue-50/50 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800/40"
        )}>
          <div className="flex items-center gap-2">
            {isCurrentActive ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
            <span>Status: {isCurrentActive ? "Active Link" : "Suggested Link"}</span>
          </div>
          <span className={cn(
            "text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md",
            isCurrentActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60" : "bg-blue-100 text-blue-800 dark:bg-blue-900/60"
          )}>
            {isCurrentActive ? "Active" : "Suggested"}
          </span>
        </div>

        {isEditing ? (
          /* EDIT MODE */
          <div className="space-y-4">
            <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <h4 className="text-[11px] uppercase font-extrabold text-zinc-400 tracking-wider">Source Columns Map</h4>
              
              <div>
                <label className="text-[10px] font-bold text-zinc-500 mb-1 block">From Column ({sourceDataset.name})</label>
                <select 
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                  value={editSourceCol}
                  onChange={(e) => setEditSourceCol(e.target.value)}
                >
                  {sourceDataset.headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 mb-1 block">To Column ({targetDataset.name})</label>
                <select 
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                  value={editTargetCol}
                  onChange={(e) => setEditTargetCol(e.target.value)}
                >
                  {targetDataset.headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 mb-1 block">Cardinality Relation</label>
                <select 
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                  value={editCardinality}
                  onChange={(e) => setEditCardinality(e.target.value as any)}
                >
                  <option value="1:N">One-to-Many (1:N)</option>
                  <option value="N:1">Many-to-One (N:1)</option>
                  <option value="1:1">One-to-One (1:1)</option>
                  <option value="N:M">Many-to-Many (N:M)</option>
                </select>
              </div>
            </div>

            {/* Live Validator Feedbacks */}
            {activeValidation && (
              <div className="space-y-2">
                {activeValidation.errors.map((e, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200 dark:border-red-900/40">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{e}</span>
                  </div>
                ))}
                {activeValidation.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
                {activeValidation.isValid && activeValidation.errors.length === 0 && (
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Relation checks passed successfully.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* READ-ONLY VIEW MODE */
          <>
            {/* Visual mapping card */}
            <div className="space-y-4 relative">
              <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-1">Source Dataset</div>
                <div className="font-bold text-xs text-zinc-800 dark:text-zinc-100 truncate">{sourceDataset.name}</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-100 dark:border-zinc-900">
                  {getTypeIcon(srcProfile?.type || 'text')}
                  <span className="font-mono text-[11px] truncate">{relationship.sourceColumn}</span>
                </div>
              </div>

              <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 flex items-center justify-center z-10 text-zinc-400 shadow-xs">
                <Link className="w-3.5 h-3.5 text-blue-500" />
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-1">Target Dataset</div>
                <div className="font-bold text-xs text-zinc-800 dark:text-zinc-100 truncate">{targetDataset.name}</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-100 dark:border-zinc-900">
                  {getTypeIcon(tgtProfile?.type || 'text')}
                  <span className="font-mono text-[11px] truncate">{relationship.targetColumn}</span>
                </div>
              </div>
            </div>

            {/* Core statistics cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-zinc-100 dark:border-zinc-850 rounded-xl p-3 bg-white dark:bg-zinc-950 flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Confidence</span>
                <span className="text-base font-black text-zinc-900 dark:text-zinc-100">{relationship.isManual ? '100' : relationship.confidence}%</span>
              </div>
              <div className="border border-zinc-100 dark:border-zinc-850 rounded-xl p-3 bg-white dark:bg-zinc-950 flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Cardinality</span>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{relationship.type}</span>
              </div>
            </div>

            {/* Matching Value Stats */}
            {activeValidation?.stats && (
              <div className="bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850 rounded-xl p-3.5 space-y-3">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Validation Metrics</h4>
                
                <div className="space-y-2">
                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-zinc-600 dark:text-zinc-400">Match Alignment Ratio</span>
                      <span className="text-zinc-900 dark:text-zinc-100">{activeValidation.stats.overlapPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-150 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          activeValidation.stats.overlapPct >= 80 ? "bg-emerald-500" :
                          activeValidation.stats.overlapPct >= 40 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${activeValidation.stats.overlapPct}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Summary sentences */}
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                    {activeValidation.stats.overlapPct}% of <span className="font-bold text-zinc-800 dark:text-zinc-200">{targetDataset.name}.{relationship.targetColumn}</span> key values have a corresponding match in <span className="font-bold text-zinc-800 dark:text-zinc-200">{sourceDataset.name}.{relationship.sourceColumn}</span>.
                  </p>

                  <div className="text-[11px] text-zinc-500 border-t border-zinc-200/40 dark:border-zinc-800/40 pt-2 flex justify-between font-mono">
                    <span>Unmatched Keys:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {activeValidation.stats.unmatchedCount} out of {activeValidation.stats.totalCount} ({100 - activeValidation.stats.overlapPct}% unmatched)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Example Values */}
            {activeValidation?.stats?.sampleMatches && activeValidation.stats.sampleMatches.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Sample Key Overlaps</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeValidation.stats.sampleMatches.map((val, idx) => (
                    <div key={idx} className="bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-md text-[11px] font-mono border border-zinc-200/50 dark:border-zinc-700/50 truncate max-w-[140px]" title={val}>
                      {val}
                    </div>
                  ))}
                  {activeValidation.stats.totalCount > activeValidation.stats.sampleMatches.length && (
                    <span className="text-[11px] text-zinc-400 self-center px-1 font-mono">...</span>
                  )}
                </div>
              </div>
            )}

            {/* Reason */}
            {!relationship.isManual && (
              <div>
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Detection Reason</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed bg-blue-50/50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 p-2.5 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                  {relationship.reason}
                </p>
              </div>
            )}

            {/* Warnings display */}
            {relationship.warnings?.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Validation Alerts</h4>
                {relationship.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>

      {/* FOOTER ACTIONS COMPONENT */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col gap-2 shrink-0">
        {isEditing ? (
          /* EDITING BUTTONS */
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setEditSourceCol(relationship.sourceColumn);
                setEditTargetCol(relationship.targetColumn);
                setEditCardinality(relationship.type);
              }}
              className="flex-1 text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer h-9 font-bold"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={!activeValidation?.isValid}
              className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer h-9 font-bold"
            >
              Save Changes
            </Button>
          </div>
        ) : isConfirmingDelete ? (
          /* DELETING CONFIRMATION */
          <div className="space-y-2 border border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/10 p-2.5 rounded-xl">
            <p className="text-[11px] text-red-800 dark:text-red-400 leading-relaxed font-semibold">
              Are you sure? This deletes the relationship mapping definition but keeps all source spreadsheet rows intact.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmingDelete(false)}
                className="flex-1 text-[11px] border-zinc-200 dark:border-zinc-800 cursor-pointer font-bold"
              >
                No, Keep it
              </Button>
              <Button 
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="flex-1 text-[11px] bg-red-600 text-white hover:bg-red-700 cursor-pointer font-bold"
              >
                Yes, Delete Link
              </Button>
            </div>
          </div>
        ) : (
          /* DEFAULT DETAILED VIEW ACTIONS */
          <div className="space-y-2">
            {!isCurrentActive ? (
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs cursor-pointer h-9 font-bold"
                onClick={() => onStatusChange(relationship.id, 'accepted')}
              >
                <Check className="w-4 h-4 mr-1.5" />
                Accept Suggestion
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer h-9 font-bold gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                  Edit
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="flex-1 text-xs border-zinc-200 dark:border-zinc-800 text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 cursor-pointer h-9 font-bold gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </div>
            )}

            {!isCurrentActive && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 text-xs border-zinc-200 dark:border-zinc-800 cursor-pointer font-semibold"
                  onClick={() => onStatusChange(relationship.id, 'rejected')}
                >
                  <EyeOff className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                  Reject
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 text-xs border-zinc-200 dark:border-zinc-800 cursor-pointer font-semibold"
                  onClick={() => onStatusChange(relationship.id, 'pending')}
                  disabled={relationship.status === 'pending'}
                >
                  Ignore
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
