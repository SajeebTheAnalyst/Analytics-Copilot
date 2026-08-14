import React, { useState, useMemo, useRef } from 'react';
import { 
  Calculator, Plus, Check, AlertCircle, X, Sparkles, Code, Table as TableIcon, HelpCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { validateFormula, evaluateAllFormulas, getFormulaTopologicalOrder } from '@/lib/formulaEngine';

interface FormulaBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFormula: (colName: string, formula: string) => void;
  availableHeaders: string[];
  existingFormulas: Record<string, string>;
  editingColName?: string | null;
  sampleData: Record<string, any>[];
}

export function FormulaBuilderModal({
  isOpen,
  onClose,
  onApplyFormula,
  availableHeaders,
  existingFormulas,
  editingColName,
  sampleData,
}: FormulaBuilderModalProps) {
  const [colName, setColName] = useState<string>(editingColName || '');
  const [formulaInput, setFormulaInput] = useState<string>(
    editingColName && existingFormulas[editingColName]
      ? existingFormulas[editingColName]
      : '='
  );
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [selectedFunc, setSelectedFunc] = useState<string>('SUM');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formulaInputRef = useRef<HTMLInputElement>(null);

  // Sync state if editing column changes
  React.useEffect(() => {
    if (editingColName) {
      setColName(editingColName);
      setFormulaInput(existingFormulas[editingColName] || '=');
    } else {
      setColName('');
      setFormulaInput('=');
    }
    setSubmitError(null);
  }, [editingColName, isOpen]);

  // Headers available for formula referencing (excluding the current column being edited to prevent immediate self-reference)
  const selectableHeaders = useMemo(() => {
    return availableHeaders.filter((h) => h !== colName);
  }, [availableHeaders, colName]);

  // Real-time formula validation
  const validation = useMemo(() => {
    const trimmed = formulaInput.trim();
    if (!trimmed || trimmed === '=') {
      return { isValid: false, error: 'Enter a formula expression.' };
    }

    const valRes = validateFormula(trimmed, availableHeaders);
    if (!valRes.isValid) {
      return { isValid: false, error: valRes.error };
    }

    // Check circular dependency
    if (colName.trim()) {
      const testFormulas = { ...existingFormulas, [colName.trim()]: trimmed };
      const topoRes = getFormulaTopologicalOrder(testFormulas, availableHeaders);
      if (topoRes.error) {
        return { isValid: false, error: topoRes.error };
      }
    }

    return { isValid: true, error: null };
  }, [formulaInput, availableHeaders, existingFormulas, colName]);

  // Real-time live preview calculation for top 5 rows
  const livePreview = useMemo(() => {
    if (!validation.isValid || !colName.trim() || sampleData.length === 0) {
      return null;
    }

    const testFormulas = { ...existingFormulas, [colName.trim()]: formulaInput.trim() };
    const evalRes = evaluateAllFormulas(availableHeaders, sampleData.slice(0, 5), testFormulas);

    if (evalRes.error) {
      return { error: evalRes.error, rows: [] };
    }

    const previewRows = evalRes.updatedData.map((r, idx) => ({
      rowIdx: idx + 1,
      val: r[colName.trim()],
    }));

    return { error: null, rows: previewRows };
  }, [validation, colName, formulaInput, availableHeaders, existingFormulas, sampleData]);

  if (!isOpen) return null;

  // Insert text into formula input at cursor position
  const insertIntoFormula = (textToInsert: string) => {
    const input = formulaInputRef.current;
    if (!input) {
      setFormulaInput((prev) => prev + textToInsert);
      return;
    }

    const start = input.selectionStart ?? formulaInput.length;
    const end = input.selectionEnd ?? formulaInput.length;
    const nextVal = formulaInput.substring(0, start) + textToInsert + formulaInput.substring(end);
    setFormulaInput(nextVal);

    setTimeout(() => {
      input.focus();
      const nextPos = start + textToInsert.length;
      input.setSelectionRange(nextPos, nextPos);
    }, 50);
  };

  const handleInsertColumn = (col: string) => {
    if (!col) return;
    // Safely wrap in single quotes if column name contains spaces
    const colRef = col.includes(' ') ? `'${col}'` : col;
    insertIntoFormula(colRef);
  };

  const handleInsertFunction = (func: string) => {
    if (!func) return;
    const funcTemplate = `${func}()`;
    insertIntoFormula(funcTemplate);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const name = colName.trim();
    if (!name) {
      setSubmitError('Calculated column name is required.');
      return;
    }

    // Check if name collides with a non-formula standard column
    const isStandardCol = availableHeaders.includes(name) && !existingFormulas[name];
    if (isStandardCol) {
      setSubmitError(`A standard column named "${name}" already exists. Please choose a unique name.`);
      return;
    }

    if (!validation.isValid) {
      setSubmitError(validation.error || 'Formula is invalid.');
      return;
    }

    onApplyFormula(name, formulaInput.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingColName ? `Edit Formula Column: "${editingColName}"` : 'Add Formula Column'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Create a calculated column evaluated across all dataset rows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="p-6 overflow-y-auto custom-scrollbar space-y-5">
          {/* Column Name Input */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Calculated Column Name
            </label>
            <input
              type="text"
              placeholder="e.g. Profit, Margin, TotalRevenue"
              value={colName}
              onChange={(e) => setColName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-semibold bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              required
            />
          </div>

          {/* Formula Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Formula Expression
              </label>
              {validation.isValid ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/40">
                  <Check className="w-3 h-3" /> Valid Expression
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/40">
                  <AlertCircle className="w-3 h-3" /> Syntax Issue
                </span>
              )}
            </div>

            <div className="relative">
              <input
                ref={formulaInputRef}
                type="text"
                value={formulaInput}
                onChange={(e) => setFormulaInput(e.target.value)}
                placeholder="e.g. =Revenue - Cost or =SUM(Sales)"
                className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-zinc-900 text-indigo-300 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-inner"
              />
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">
              Supports <code className="font-mono text-indigo-400">+ - * / ()</code> and aggregations <code className="font-mono text-indigo-400">SUM(), AVERAGE(), COUNT(), MIN(), MAX()</code>
            </p>
          </div>

          {/* Quick Insertion Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            {/* Columns Helper */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Available Columns
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none"
                >
                  <option value="">Select column...</option>
                  {selectableHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h} {existingFormulas[h] ? '(fx)' : ''}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleInsertColumn(selectedColumn)}
                  disabled={!selectedColumn}
                  className="h-8 text-xs font-bold gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Insert
                </Button>
              </div>
            </div>

            {/* Functions Helper */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Functions & Operators
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedFunc}
                  onChange={(e) => setSelectedFunc(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none font-mono"
                >
                  <option value="SUM">SUM(col)</option>
                  <option value="AVERAGE">AVERAGE(col)</option>
                  <option value="COUNT">COUNT(col)</option>
                  <option value="MIN">MIN(col)</option>
                  <option value="MAX">MAX(col)</option>
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleInsertFunction(selectedFunc)}
                  className="h-8 text-xs font-bold gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Insert
                </Button>
              </div>
            </div>
          </div>

          {/* Error Alert Banner */}
          {(!validation.isValid || submitError) && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Validation Error</span>
                <span className="font-mono text-[11px]">{submitError || validation.error}</span>
              </div>
            </div>
          )}

          {/* Live Preview Table */}
          {livePreview && livePreview.rows.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <TableIcon className="w-3.5 h-3.5 text-indigo-500" />
                  Live Preview (Top {livePreview.rows.length} rows)
                </span>
                <span className="text-[10px] font-mono text-zinc-400">Calculated in real-time</span>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden font-mono text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="py-1.5 px-3 border-r border-zinc-200 dark:border-zinc-800 w-12 text-center">Row</th>
                      <th className="py-1.5 px-3 border-r border-zinc-200 dark:border-zinc-800">Preview Value ({colName || 'Result'})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
                    {livePreview.rows.map((r) => (
                      <tr key={r.rowIdx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                        <td className="py-1.5 px-3 border-r border-zinc-200 dark:border-zinc-800 text-center font-bold text-zinc-400 text-[10px]">
                          #{r.rowIdx}
                        </td>
                        <td className="py-1.5 px-3 text-indigo-600 dark:text-indigo-400 font-bold">
                          {r.val === null ? <span className="text-zinc-400 italic">null</span> : String(r.val)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!validation.isValid || !colName.trim()}
              className="h-9 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Apply Formula</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
