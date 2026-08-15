import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, Check, X, ShieldAlert, Sparkles, RefreshCw, Layers, HelpCircle, ArrowRight
} from 'lucide-react';
import { Button } from '../ui/button';
import { 
  ExtendedType, 
  ColumnTypeProfile, 
  profileColumnType, 
  convertValueToType, 
  isBlankValue 
} from '@/lib/typeStandardizer';
import { ColumnType } from '@/types';

interface TypeConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  header: string;
  currentType: ColumnType | string;
  workingData: Record<string, any>[];
  isFormulaColumn?: boolean;
  onConfirmConversion: (header: string, targetType: ExtendedType, convertedData: Record<string, any>[]) => void;
}

export function TypeConversionModal({
  isOpen,
  onClose,
  header,
  currentType,
  workingData,
  isFormulaColumn,
  onConfirmConversion,
}: TypeConversionModalProps) {
  if (!isOpen || !header) return null;

  // Profile the column against the current working data
  const profile: ColumnTypeProfile = useMemo(() => {
    return profileColumnType(workingData, header, currentType);
  }, [workingData, header, currentType]);

  const [selectedTargetType, setSelectedTargetType] = useState<ExtendedType>(profile.detectedType || 'Text');

  // Compute live conversion stats for the selected target type
  const conversionAnalysis = useMemo(() => {
    let validCount = 0;
    let invalidCount = 0;
    let blankCount = 0;

    const rowSamples: { rowId: string; raw: any; converted: any; isValid: boolean; isBlank: boolean }[] = [];

    const nextData = workingData.map((row, idx) => {
      const rawVal = row[header];
      const rowId = row._rowId || `row-${idx}`;

      if (isBlankValue(rawVal)) {
        blankCount++;
        if (rowSamples.length < 25) {
          rowSamples.push({ rowId, raw: rawVal, converted: null, isValid: true, isBlank: true });
        }
        return { ...row, [header]: null };
      }

      const { value, isValid } = convertValueToType(rawVal, selectedTargetType);
      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      if (rowSamples.length < 25) {
        rowSamples.push({ rowId, raw: rawVal, converted: value, isValid, isBlank: false });
      }

      return {
        ...row,
        [header]: isValid ? value : null, // Set invalid to null on conversion as per clean spec
      };
    });

    return {
      validCount,
      invalidCount,
      blankCount,
      totalRows: workingData.length,
      rowSamples,
      nextData,
    };
  }, [workingData, header, selectedTargetType]);

  const handleConfirm = () => {
    if (isFormulaColumn) return;
    onConfirmConversion(header, selectedTargetType, conversionAnalysis.nextData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-transparent pointer-events-none flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="pointer-events-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Standardize Column Type — <span className="text-blue-600 dark:text-blue-400 font-mono">{header}</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Detect, validate, and convert cell values to a clean data type.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">

          {/* Formula Column Protection Notice */}
          {isFormulaColumn && (
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-indigo-900 dark:text-indigo-200">Formula Column Protected</p>
                <p className="text-indigo-700 dark:text-indigo-300 mt-0.5">
                  This column is calculated via formula. Destructive type conversions are disabled to protect formula integrity.
                </p>
              </div>
            </div>
          )}

          {/* Numeric Stored as Text Alert */}
          {profile.isNumericStoredAsText && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Numeric values stored as text detected
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                  Values contain formatting symbols (such as <code className="bg-amber-100 dark:bg-amber-900/60 px-1 rounded font-mono">$2,500</code>, <code className="bg-amber-100 dark:bg-amber-900/60 px-1 rounded font-mono">1,500</code>, or <code className="bg-amber-100 dark:bg-amber-900/60 px-1 rounded font-mono">30%</code>). Converting to Numeric will parse these into clean number values.
                </p>
              </div>
            </div>
          )}

          {/* Target Type Selector & Profiling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                Target Data Type
              </label>
              <select
                disabled={isFormulaColumn}
                value={selectedTargetType}
                onChange={(e) => setSelectedTargetType(e.target.value as ExtendedType)}
                className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <option value="Numeric">Numeric (Number)</option>
                <option value="Integer">Integer (Whole Number)</option>
                <option value="Decimal">Decimal (Floating Point)</option>
                <option value="Date">Date (YYYY-MM-DD)</option>
                <option value="DateTime">DateTime (YYYY-MM-DD HH:mm:ss)</option>
                <option value="Time">Time (HH:mm:ss)</option>
                <option value="Boolean">Boolean (True / False)</option>
                <option value="Categorical">Categorical</option>
                <option value="Text">Text (Plain String)</option>
              </select>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Auto-Detected Type: <span className="font-bold text-blue-600 dark:text-blue-400">{profile.detectedType}</span>
              </p>
            </div>

            {/* Profile Statistics Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-3 text-center flex flex-col justify-center">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Valid</span>
                <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">{conversionAnalysis.validCount}</span>
                <span className="text-[10px] text-emerald-600/80">({Math.round((conversionAnalysis.validCount / (conversionAnalysis.totalRows || 1)) * 100)}%)</span>
              </div>

              <div className="bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl p-3 text-center flex flex-col justify-center">
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">Invalid</span>
                <span className="text-base font-extrabold text-red-700 dark:text-red-300 mt-0.5">{conversionAnalysis.invalidCount}</span>
                <span className="text-[10px] text-red-600/80">({Math.round((conversionAnalysis.invalidCount / (conversionAnalysis.totalRows || 1)) * 100)}%)</span>
              </div>

              <div className="bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-center flex flex-col justify-center">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">Blank / Null</span>
                <span className="text-base font-extrabold text-zinc-700 dark:text-zinc-300 mt-0.5">{conversionAnalysis.blankCount}</span>
                <span className="text-[10px] text-zinc-500">({Math.round((conversionAnalysis.blankCount / (conversionAnalysis.totalRows || 1)) * 100)}%)</span>
              </div>
            </div>
          </div>

          {/* Invalid Value Warning Notice */}
          {conversionAnalysis.invalidCount > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl flex items-start gap-2 text-xs text-red-700 dark:text-red-300 font-medium">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <strong>Warning: {conversionAnalysis.invalidCount} invalid values cannot be converted.</strong>
                <p className="text-[11px] mt-0.5">
                  Values like string letters or malformed text cannot be coerced to {selectedTargetType}. They will be safely set to <code className="bg-red-100 dark:bg-red-900/60 px-1 rounded font-mono text-red-800 dark:text-red-200">null</code> without destroying valid rows.
                </p>
              </div>
            </div>
          )}

          {/* Conversion Preview Sample Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                Sample Value Conversion Preview ({conversionAnalysis.rowSamples.length} rows)
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">Original → Converted</span>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-white dark:bg-zinc-950">
              <table className="w-full text-left text-xs font-mono">
                <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-sans font-bold text-zinc-600 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">Raw Value</th>
                    <th className="px-3 py-2 w-8"></th>
                    <th className="px-3 py-2">Converted Value ({selectedTargetType})</th>
                    <th className="px-3 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {conversionAnalysis.rowSamples.map((sample, i) => (
                    <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                      <td className="px-3 py-1.5 text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">
                        {sample.raw === null || sample.raw === undefined || sample.raw === '' ? (
                          <span className="text-zinc-400 italic">null</span>
                        ) : (
                          String(sample.raw)
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-zinc-400 text-center">
                        <ArrowRight className="w-3.5 h-3.5 inline" />
                      </td>
                      <td className="px-3 py-1.5 font-bold truncate max-w-[180px]">
                        {sample.converted === null ? (
                          <span className="text-zinc-400 italic">null</span>
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400">{String(sample.converted)}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right font-sans">
                        {sample.isBlank ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500">Blank</span>
                        ) : sample.isValid ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">Valid</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">Invalid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <p className="text-[11px] text-zinc-500">
            Changes apply to working copy until saved.
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
              disabled={isFormulaColumn}
              type="button"
              size="sm"
              onClick={handleConfirm}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
            >
              Confirm & Convert Type
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
