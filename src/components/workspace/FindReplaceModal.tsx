import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, Replace, ChevronLeft, ChevronRight, X, AlertCircle, Check, AlertTriangle
} from 'lucide-react';
import { Button } from '../ui/button';
import { ColumnType } from '@/types';

export interface MatchItem {
  rIndex: number; // Index in displayedRows
  cIndex: number; // Index in visibleHeaders
  rowId: string;
  header: string;
  currentVal: any;
}

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableHeaders: string[];
  visibleHeaders: string[];
  workingFormulas: Record<string, string>;
  workingColumnTypes: Record<string, ColumnType>;
  displayedRows: Record<string, any>[];
  workingData: Record<string, any>[];
  selectedHeader?: string;
  selectedCell?: { row: number; col: number } | null;
  onNavigateToMatch: (match: MatchItem) => void;
  onReplaceSingle: (match: MatchItem, replaceText: string) => void;
  onReplaceAll: (matchesToReplace: MatchItem[], replaceText: string) => void;
  onMatchesFoundChange: (matches: MatchItem[], activeMatchIndex: number) => void;
}

const EMPTY_MATCHES: MatchItem[] = [];

export function FindReplaceModal({
  isOpen,
  onClose,
  availableHeaders,
  visibleHeaders,
  workingFormulas,
  workingColumnTypes,
  displayedRows,
  workingData,
  selectedHeader,
  selectedCell,
  onNavigateToMatch,
  onReplaceSingle,
  onReplaceAll,
  onMatchesFoundChange,
}: FindReplaceModalProps) {
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [searchScope, setSearchScope] = useState<'all' | 'column'>('all');
  const [targetColumn, setTargetColumn] = useState<string>(selectedHeader || visibleHeaders[0] || '');
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [matchEntireCell, setMatchEntireCell] = useState<boolean>(false);

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [showReplaceAllConfirm, setShowReplaceAllConfirm] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Sync default target column if selectedHeader changes
  useEffect(() => {
    if (selectedHeader && visibleHeaders.includes(selectedHeader)) {
      setTargetColumn(selectedHeader);
    }
  }, [selectedHeader, visibleHeaders]);

  // Compute matches across displayed rows
  const matches = useMemo(() => {
    const trimmedFind = findText;
    if (!trimmedFind && trimmedFind !== '0') {
      return EMPTY_MATCHES;
    }

    const headersToSearch = searchScope === 'column' && targetColumn
      ? [targetColumn]
      : visibleHeaders;

    const resultList: MatchItem[] = [];

    const queryToCompare = matchCase ? trimmedFind : trimmedFind.toLowerCase();

    displayedRows.forEach((row, rIdx) => {
      headersToSearch.forEach((header) => {
        const cIdx = visibleHeaders.indexOf(header);
        if (cIdx === -1) return;

        const val = row[header];
        if (val === null || val === undefined) return;

        const strVal = String(val);
        const valToCompare = matchCase ? strVal : strVal.toLowerCase();

        let isMatch = false;
        if (matchEntireCell) {
          isMatch = valToCompare === queryToCompare;
        } else {
          isMatch = valToCompare.includes(queryToCompare);
        }

        if (isMatch) {
          resultList.push({
            rIndex: rIdx,
            cIndex: cIdx,
            rowId: row._rowId,
            header,
            currentVal: val,
          });
        }
      });
    });

    if (resultList.length === 0) {
      return EMPTY_MATCHES;
    }

    return resultList;
  }, [findText, searchScope, targetColumn, visibleHeaders, displayedRows, matchCase, matchEntireCell]);

  const onMatchesFoundChangeRef = useRef(onMatchesFoundChange);
  useEffect(() => {
    onMatchesFoundChangeRef.current = onMatchesFoundChange;
  }, [onMatchesFoundChange]);

  const prevReportedRef = useRef<{ matches: MatchItem[]; index: number }>({
    matches: EMPTY_MATCHES,
    index: -1,
  });

  // Reset or adjust active index when matches change
  useEffect(() => {
    if (matches.length === 0) {
      setActiveIndex(0);
      if (
        prevReportedRef.current.matches !== EMPTY_MATCHES ||
        prevReportedRef.current.index !== -1
      ) {
        prevReportedRef.current = { matches: EMPTY_MATCHES, index: -1 };
        onMatchesFoundChangeRef.current(EMPTY_MATCHES, -1);
      }
      return;
    }

    // Try to find the match closest to current selection
    let nextIndex = 0;
    if (selectedCell) {
      const foundIdx = matches.findIndex(
        (m) => m.rIndex === selectedCell.row && m.cIndex === selectedCell.col
      );
      if (foundIdx !== -1) {
        nextIndex = foundIdx;
      }
    }

    if (nextIndex >= matches.length) {
      nextIndex = 0;
    }

    setActiveIndex(nextIndex);

    if (
      prevReportedRef.current.matches !== matches ||
      prevReportedRef.current.index !== nextIndex
    ) {
      prevReportedRef.current = { matches, index: nextIndex };
      onMatchesFoundChangeRef.current(matches, nextIndex);
    }
  }, [matches, selectedCell?.row, selectedCell?.col]);

  if (!isOpen) return null;

  const currentMatch = matches[activeIndex] || null;

  const handleNextMatch = () => {
    if (matches.length === 0) return;
    const nextIdx = (activeIndex + 1) % matches.length;
    setActiveIndex(nextIdx);
    onMatchesFoundChange(matches, nextIdx);
    onNavigateToMatch(matches[nextIdx]);
  };

  const handlePrevMatch = () => {
    if (matches.length === 0) return;
    const prevIdx = (activeIndex - 1 + matches.length) % matches.length;
    setActiveIndex(prevIdx);
    onMatchesFoundChange(matches, prevIdx);
    onNavigateToMatch(matches[prevIdx]);
  };

  const handleReplaceCurrent = () => {
    setWarningMessage(null);
    if (!currentMatch) return;

    if (workingFormulas[currentMatch.header]) {
      setWarningMessage(`Formula column "${currentMatch.header}" cannot be bulk edited. Edit the formula instead.`);
      return;
    }

    onReplaceSingle(currentMatch, replaceText);
  };

  const handleTriggerReplaceAll = () => {
    setWarningMessage(null);
    if (matches.length === 0) return;

    // Filter out formula columns
    const replaceableMatches = matches.filter((m) => !workingFormulas[m.header]);

    if (replaceableMatches.length === 0) {
      setWarningMessage('Formula columns cannot be bulk edited. Edit the formula instead.');
      return;
    }

    setShowReplaceAllConfirm(true);
  };

  const handleConfirmReplaceAll = () => {
    const replaceableMatches = matches.filter((m) => !workingFormulas[m.header]);
    onReplaceAll(replaceableMatches, replaceText);
    setShowReplaceAllConfirm(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Search className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Find & Replace</span>
        </div>

        <div className="flex items-center gap-2">
          {matches.length > 0 && (
            <span className="text-[11px] font-mono font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
              {activeIndex + 1} of {matches.length} matches
            </span>
          )}
          {findText && matches.length === 0 && (
            <span className="text-[11px] font-mono font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
              0 matches
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-3.5 text-xs">
        {/* Find Input */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            Find what
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Search dataset..."
              className="w-full pl-3 pr-20 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
              autoFocus
            />
            {/* Match Navigation Buttons */}
            <div className="absolute right-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMatch}
                disabled={matches.length === 0}
                className="p-1 rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                title="Previous Match"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMatch}
                disabled={matches.length === 0}
                className="p-1 rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                title="Next Match"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Replace Input */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            Replace with
          </label>
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replacement text or number..."
            className="w-full px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
          />
        </div>

        {/* Search Options & Scope */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Search Scope
            </label>
            <select
              value={searchScope}
              onChange={(e) => setSearchScope(e.target.value as any)}
              className="w-full px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200"
            >
              <option value="all">All Columns</option>
              <option value="column">Selected Column</option>
            </select>
          </div>

          {searchScope === 'column' && (
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Column Name
              </label>
              <select
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200"
              >
                {visibleHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h} {workingFormulas[h] ? '(fx)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Checkbox Toggles */}
        <div className="flex items-center gap-4 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
            />
            Match case
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={matchEntireCell}
              onChange={(e) => setMatchEntireCell(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
            />
            Match entire cell
          </label>
        </div>

        {/* Warning Toast */}
        {warningMessage && (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-700 dark:text-amber-300 text-[11px] flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>{warningMessage}</span>
          </div>
        )}

        {/* Replace Confirmation Modal Overlay */}
        {showReplaceAllConfirm && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 rounded-xl space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Replace {matches.filter((m) => !workingFormulas[m.header]).length} matching values?</span>
            </div>
            <p className="text-[10px] text-indigo-700 dark:text-indigo-300">
              This will update all non-formula occurrences in the editable working copy.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowReplaceAllConfirm(false)}
                className="h-7 text-xs px-2.5 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmReplaceAll}
                className="h-7 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
              >
                Replace All
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showReplaceAllConfirm && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReplaceCurrent}
              disabled={matches.length === 0 || !currentMatch}
              className="h-8 text-xs font-semibold cursor-pointer disabled:opacity-40"
            >
              Replace
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleTriggerReplaceAll}
              disabled={matches.length === 0}
              className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs gap-1 disabled:opacity-40"
            >
              <Replace className="w-3.5 h-3.5" />
              Replace All
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
