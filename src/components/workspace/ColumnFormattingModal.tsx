import React, { useState } from 'react';
import { Sliders, X, Eye, DollarSign, Calendar, Hash, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { 
  ColumnFormatConfig, 
  DateFormatOption, 
  NumberFormatType, 
  formatColumnValue 
} from '@/lib/typeStandardizer';
import { ColumnType } from '@/types';

interface ColumnFormattingModalProps {
  isOpen: boolean;
  onClose: () => void;
  header: string;
  colType: ColumnType | string;
  currentConfig?: ColumnFormatConfig;
  sampleValues: any[];
  onApplyFormat: (header: string, config: ColumnFormatConfig) => void;
}

export function ColumnFormattingModal({
  isOpen,
  onClose,
  header,
  colType,
  currentConfig,
  sampleValues,
  onApplyFormat,
}: ColumnFormattingModalProps) {
  if (!isOpen || !header) return null;

  const isNumericType = ['numeric', 'decimal', 'integer'].includes(String(colType).toLowerCase());
  const isDateType = ['date', 'datetime'].includes(String(colType).toLowerCase());

  // Default state from existing config or standard defaults
  const [dateFormat, setDateFormat] = useState<DateFormatOption>(
    currentConfig?.dateFormat || 'YYYY-MM-DD'
  );

  const [numberFormat, setNumberFormat] = useState<NumberFormatType>(
    currentConfig?.numberFormat || 'number'
  );

  const [currencySymbol, setCurrencySymbol] = useState<string>(
    currentConfig?.currencySymbol || '$'
  );

  const [decimals, setDecimals] = useState<number>(
    currentConfig?.decimals !== undefined ? currentConfig.decimals : (numberFormat === 'decimal' || numberFormat === 'currency' ? 2 : 0)
  );

  const [useThousandsSeparator, setUseThousandsSeparator] = useState<boolean>(
    currentConfig?.useThousandsSeparator !== false
  );

  const activeConfig: ColumnFormatConfig = {
    dateFormat: isDateType ? dateFormat : undefined,
    numberFormat: isNumericType ? numberFormat : undefined,
    currencySymbol: isNumericType && numberFormat === 'currency' ? currencySymbol : undefined,
    decimals: isNumericType ? decimals : undefined,
    useThousandsSeparator: isNumericType ? useThousandsSeparator : undefined,
  };

  const handleSave = () => {
    onApplyFormat(header, activeConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Display Format — <span className="text-indigo-600 dark:text-indigo-400 font-mono">{header}</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Format screen presentation without altering raw stored data.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs">

          {/* Numeric Formatting Options */}
          {isNumericType && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Format Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'number', label: 'Number', icon: Hash },
                    { id: 'decimal', label: 'Decimal', icon: Hash },
                    { id: 'currency', label: 'Currency', icon: DollarSign },
                    { id: 'percentage', label: 'Percentage', icon: Hash },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => {
                        setNumberFormat(style.id as NumberFormatType);
                        if (style.id === 'decimal' || style.id === 'currency') {
                          if (decimals === 0) setDecimals(2);
                        }
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                        numberFormat === style.id
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <style.icon className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency Symbol Selection */}
              {numberFormat === 'currency' && (
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Currency Symbol
                  </label>
                  <select
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full px-3 py-2 font-bold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 cursor-pointer"
                  >
                    <option value="$">$ (USD / AUD / CAD / SGD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                    <option value="¥">¥ (JPY / CNY)</option>
                    <option value="₹">₹ (INR)</option>
                    <option value="৳">৳ (BDT)</option>
                  </select>
                </div>
              )}

              {/* Decimal Places */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">
                    Decimal Places
                  </label>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{decimals}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6}
                  value={decimals}
                  onChange={(e) => setDecimals(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Thousands Separator Toggle */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 cursor-pointer">
                <span className="font-bold text-zinc-700 dark:text-zinc-300">
                  Thousands Separator (e.g. 1,500)
                </span>
                <input
                  type="checkbox"
                  checked={useThousandsSeparator}
                  onChange={(e) => setUseThousandsSeparator(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* Date / DateTime Formatting Options */}
          {isDateType && (
            <div className="space-y-3">
              <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                Date Display Format
              </label>
              <div className="space-y-2">
                {[
                  { id: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 14/10/2020)' },
                  { id: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 10/14/2020)' },
                  { id: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g. 2020-10-14)' },
                  { id: 'MMM YYYY', label: 'MMM YYYY (e.g. Oct 2020)' },
                  { id: 'YYYY', label: 'YYYY (e.g. 2020)' },
                  { id: 'DD MMM YYYY, HH:mm', label: 'DD MMM YYYY, HH:mm (e.g. 14 Oct 2020, 14:30)' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDateFormat(option.id as DateFormatOption)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                      dateFormat === option.id
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span>{option.label}</span>
                    {dateFormat === option.id && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isNumericType && !isDateType && (
            <p className="text-zinc-500 italic text-center py-4">
              Display formatting controls are available for Numeric, Date, and DateTime columns.
            </p>
          )}

          {/* Real-time Preview Panel */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
              <Eye className="w-4 h-4 text-indigo-500" />
              <span>Real-time Screen Preview</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <span className="text-[10px] text-zinc-400 block font-sans">Raw Stored Value</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {sampleValues[0] !== undefined ? String(sampleValues[0]) : '1500'}
                </span>
              </div>
              <div className="p-2 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-lg">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-sans font-bold">Screen Displayed Format</span>
                <span className="font-extrabold text-indigo-700 dark:text-indigo-300">
                  {formatColumnValue(sampleValues[0] ?? 1500, colType, activeConfig)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <p className="text-[10px] text-zinc-400">
            Stored primitives remain unchanged.
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
              onClick={handleSave}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
            >
              Apply Format
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
