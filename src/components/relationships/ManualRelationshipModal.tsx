import React, { useState, useMemo, useEffect } from 'react';
import { Dataset, RelationshipSuggestion } from '@/types';
import { X, Check, Link, AlertTriangle, ShieldAlert, Sparkles, Hash, ToggleLeft, Calendar, CaseSensitive, HelpCircle, KeyRound } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { validateRelationship } from '@/lib/relationshipDiscovery';

interface ManualRelationshipModalProps {
  datasets: Dataset[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (newRel: RelationshipSuggestion) => void;
}

export function ManualRelationshipModal({
  datasets,
  isOpen,
  onClose,
  onSave
}: ManualRelationshipModalProps) {
  const readyDatasets = useMemo(() => {
    return datasets.filter(d => d.headers && d.headers.length > 0);
  }, [datasets]);

  // Initial selects
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [sourceCol, setSourceCol] = useState('');
  const [targetCol, setTargetCol] = useState('');
  const [cardinality, setCardinality] = useState<'1:1' | '1:N' | 'N:1' | 'N:M'>('1:N');

  // Sync default options when modal opens or datasets load
  useEffect(() => {
    if (readyDatasets.length >= 2) {
      const src = readyDatasets[0];
      const tgt = readyDatasets[1];
      setSourceId(src.id);
      setTargetId(tgt.id);
      
      if (src.headers.length > 0) setSourceCol(src.headers[0]);
      if (tgt.headers.length > 0) setTargetCol(tgt.headers[0]);
    } else if (readyDatasets.length === 1) {
      setSourceId(readyDatasets[0].id);
      if (readyDatasets[0].headers.length > 0) setSourceCol(readyDatasets[0].headers[0]);
    }
  }, [readyDatasets, isOpen]);

  // Sync columns when selected source dataset changes
  const handleSourceIdChange = (id: string) => {
    setSourceId(id);
    const ds = readyDatasets.find(d => d.id === id);
    if (ds && ds.headers.length > 0) {
      setSourceCol(ds.headers[0]);
    } else {
      setSourceCol('');
    }
  };

  // Sync columns when selected target dataset changes
  const handleTargetIdChange = (id: string) => {
    setTargetId(id);
    const ds = readyDatasets.find(d => d.id === id);
    if (ds && ds.headers.length > 0) {
      setTargetCol(ds.headers[0]);
    } else {
      setTargetCol('');
    }
  };

  const sourceDataset = useMemo(() => readyDatasets.find(d => d.id === sourceId), [readyDatasets, sourceId]);
  const targetDataset = useMemo(() => readyDatasets.find(d => d.id === targetId), [readyDatasets, targetId]);

  // Real-time Dynamic Validation State
  const validation = useMemo(() => {
    if (!sourceDataset || !targetDataset || !sourceCol || !targetCol) return null;
    return validateRelationship(sourceDataset, sourceCol, targetDataset, targetCol, cardinality);
  }, [sourceDataset, targetDataset, sourceCol, targetCol, cardinality]);

  const handleSave = () => {
    if (!validation || !validation.isValid || !sourceDataset || !targetDataset) return;

    const newRel: RelationshipSuggestion = {
      id: `manual-rel-${Date.now()}`,
      sourceDatasetId: sourceId,
      targetDatasetId: targetId,
      sourceColumn: sourceCol,
      targetColumn: targetCol,
      confidence: 100, // Manual connects always possess full confidence
      type: cardinality,
      reason: `Manually established connection by user. ${validation.stats.overlapPct}% of values align perfectly.`,
      status: 'accepted', // Manual connects default to Accepted
      warnings: validation.warnings,
      isManual: true
    };

    onSave(newRel);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
              <Link className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Establish Dataset Connection</h3>
              <p className="text-xs text-zinc-500">Link columns across spreadsheets to enable advanced analytical queries</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={onClose}>
            <X className="w-4.5 h-4.5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {readyDatasets.length < 2 ? (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 inline mr-2 align-middle shrink-0" />
              You need at least two imported sheets or tables to establish manual relationships in this workspace.
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Table Selection selectors */}
              <div className="grid grid-cols-2 gap-4">
                {/* Source Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Source Table (Left)</label>
                  <select
                    className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                    value={sourceId}
                    onChange={(e) => handleSourceIdChange(e.target.value)}
                  >
                    {readyDatasets.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Target Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Target Table (Right)</label>
                  <select
                    className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                    value={targetId}
                    onChange={(e) => handleTargetIdChange(e.target.value)}
                  >
                    {readyDatasets.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Column Selection selectors */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-950/20 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-850/50">
                {/* Source Columns */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500">Source Primary Key Column</label>
                  <select
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-xs p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                    value={sourceCol}
                    onChange={(e) => setSourceCol(e.target.value)}
                    disabled={!sourceDataset}
                  >
                    <option value="" disabled>Select Column...</option>
                    {sourceDataset?.headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Target Columns */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500">Target Foreign Key Column</label>
                  <select
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-xs p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                    value={targetCol}
                    onChange={(e) => setTargetCol(e.target.value)}
                    disabled={!targetDataset}
                  >
                    <option value="" disabled>Select Column...</option>
                    {targetDataset?.headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cardinality Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Relational Cardinality</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: '1:N', label: 'One-to-Many (1:N)', desc: 'Left is Primary, Right duplicates' },
                    { value: 'N:1', label: 'Many-to-One (N:1)', desc: 'Left duplicates, Right is Primary' },
                    { value: '1:1', label: 'One-to-One (1:1)', desc: 'Unique on both sides' }
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setCardinality(item.value as any)}
                      className={cn(
                        "p-3 rounded-xl border text-left flex flex-col gap-1 transition-all duration-200 cursor-pointer",
                        cardinality === item.value
                          ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-950 dark:text-blue-200 shadow-2xs ring-1 ring-blue-500"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      )}
                    >
                      <span className="text-xs font-bold">{item.label}</span>
                      <span className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Validation Alerts & Live Statistics */}
              {validation && (
                <div className="space-y-3.5 border-t border-zinc-150 dark:border-zinc-850 pt-5">
                  <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Diagnostic Analysis</h4>
                  
                  {/* Validation errors/warnings logs */}
                  <div className="space-y-2">
                    {validation.errors.map((e, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-900/40">
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400 animate-pulse" />
                        <span>{e}</span>
                      </div>
                    ))}
                    {validation.warnings.map((w, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <span>{w}</span>
                      </div>
                    ))}
                    {validation.isValid && validation.errors.length === 0 && (
                      <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Connection validation succeeded. Key overlaps and data types are healthy.</span>
                      </div>
                    )}
                  </div>

                  {/* Overlap Stats */}
                  {validation.isValid && (
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-850/50 space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-zinc-600 dark:text-zinc-400">Overlap Alignment Match</span>
                        <span className="text-zinc-900 dark:text-zinc-100">{validation.stats.overlapPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${validation.stats.overlapPct}%` }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-normal pt-1">
                        {validation.stats.overlapPct}% of key values in {targetDataset?.name} align with values in {sourceDataset?.name}. 
                        ({validation.stats.unmatchedCount} unmatched out of {validation.stats.totalCount} values)
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 flex justify-end gap-3 shrink-0">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="text-xs h-10 border-zinc-200 dark:border-zinc-800 font-bold px-4 cursor-pointer"
          >
            Cancel
          </Button>
          {readyDatasets.length >= 2 && (
            <Button 
              onClick={handleSave}
              disabled={!validation?.isValid}
              className="text-xs h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 cursor-pointer"
            >
              Confirm Connection
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
