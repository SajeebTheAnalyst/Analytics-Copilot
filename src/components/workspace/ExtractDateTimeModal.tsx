import React, { useState } from 'react';
import { Calendar, Clock, X, Layers, PlusCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { extractDateTimePart } from '@/lib/typeStandardizer';

interface ExtractDateTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  header: string;
  workingData: Record<string, any>[];
  onExtractConfirmed: (newHeaderName: string, newColType: 'date' | 'time', updatedData: Record<string, any>[]) => void;
}

export function ExtractDateTimeModal({
  isOpen,
  onClose,
  header,
  workingData,
  onExtractConfirmed,
}: ExtractDateTimeModalProps) {
  if (!isOpen || !header) return null;

  const [partToExtract, setPartToExtract] = useState<'date' | 'time'>('date');

  // Derive initial default column name e.g. OrderDateTime -> OrderDate or OrderTime
  const defaultColName = (() => {
    if (header.toLowerCase().includes('datetime')) {
      return partToExtract === 'date'
        ? header.replace(/datetime/i, 'Date')
        : header.replace(/datetime/i, 'Time');
    }
    return `${header}_${partToExtract === 'date' ? 'Date' : 'Time'}`;
  })();

  const [newHeaderName, setNewHeaderName] = useState<string>(defaultColName);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExtract = () => {
    const trimmed = newHeaderName.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a valid name for the new column.');
      return;
    }

    if (workingData.length > 0 && trimmed in workingData[0]) {
      setErrorMsg(`Column "${trimmed}" already exists. Please enter a unique name.`);
      return;
    }

    const updated = extractDateTimePart(workingData, header, partToExtract, trimmed);
    onExtractConfirmed(trimmed, partToExtract, updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-transparent pointer-events-none flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="pointer-events-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Extract Date or Time — <span className="text-purple-600 dark:text-purple-400 font-mono">{header}</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Creates a new column with extracted date or time parts.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Select Extraction Component
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setPartToExtract('date');
                  const nextName = header.toLowerCase().includes('datetime')
                    ? header.replace(/datetime/i, 'Date')
                    : `${header}_Date`;
                  setNewHeaderName(nextName);
                }}
                className={`p-3 rounded-xl border text-left font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  partToExtract === 'date'
                    ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Calendar className="w-4 h-4 text-purple-500" />
                <span>Extract Date</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPartToExtract('time');
                  const nextName = header.toLowerCase().includes('datetime')
                    ? header.replace(/datetime/i, 'Time')
                    : `${header}_Time`;
                  setNewHeaderName(nextName);
                }}
                className={`p-3 rounded-xl border text-left font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  partToExtract === 'time'
                    ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Clock className="w-4 h-4 text-purple-500" />
                <span>Extract Time</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              New Column Name
            </label>
            <input
              type="text"
              value={newHeaderName}
              onChange={(e) => {
                setNewHeaderName(e.target.value);
                setErrorMsg(null);
              }}
              className="w-full px-3 py-2 font-bold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 font-bold">
              {errorMsg}
            </div>
          )}

          <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30 rounded-xl text-purple-900 dark:text-purple-200">
            <p className="font-bold flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-purple-500" />
              Original Column Preserved
            </p>
            <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
              The original column <code className="font-mono bg-purple-100 dark:bg-purple-900/60 px-1 rounded">{header}</code> will remain untouched. A new column <code className="font-mono bg-purple-100 dark:bg-purple-900/60 px-1 rounded">{newHeaderName}</code> will be added to the working copy.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <p className="text-[10px] text-zinc-400">
            Applies to working copy.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExtract}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
            >
              Extract & Add Column
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
