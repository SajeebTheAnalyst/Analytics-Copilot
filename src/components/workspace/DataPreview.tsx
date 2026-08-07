import { Dataset } from '@/types';
import { Search, Hash, ToggleLeft, Calendar, HelpCircle, CaseSensitive } from 'lucide-react';
import { useState } from 'react';

interface DataPreviewProps {
  dataset: Dataset;
}

export function DataPreview({ dataset }: DataPreviewProps) {
  const [search, setSearch] = useState("");

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'numeric': return <Hash className="w-3 h-3 text-blue-500" title="Numeric" />;
      case 'boolean': return <ToggleLeft className="w-3 h-3 text-purple-500" title="Boolean" />;
      case 'date': return <Calendar className="w-3 h-3 text-emerald-500" title="Date" />;
      case 'categorical': return <CaseSensitive className="w-3 h-3 text-orange-500" title="Categorical" />;
      default: return <HelpCircle className="w-3 h-3 text-zinc-400" title="Unknown" />;
    }
  };

  const filteredHeaders = dataset.headers.filter(h => h.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
      <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 shrink-0 bg-zinc-50 dark:bg-zinc-950">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            {dataset.name}
            <span className="text-[10px] font-normal text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">Preview (Top 100)</span>
          </h2>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search columns..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 text-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-zinc-100 dark:bg-zinc-900 shadow-sm border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="w-12 px-4 py-3 text-zinc-500 font-medium text-center border-r border-zinc-200 dark:border-zinc-800">#</th>
              {filteredHeaders.map(header => (
                <th key={header} className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 whitespace-nowrap">
                  <div className="flex items-center justify-between gap-4">
                    <span>{header}</span>
                    {getTypeIcon(dataset.columnTypes[header])}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataset.data.map((row, idx) => (
              <tr key={idx} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="px-4 py-2 text-zinc-400 text-center border-r border-zinc-100 dark:border-zinc-800/50">{idx + 1}</td>
                {filteredHeaders.map(header => (
                  <td key={header} className="px-4 py-2 text-zinc-700 dark:text-zinc-300 border-r border-zinc-100 dark:border-zinc-800/50 truncate max-w-xs" title={String(row[header] ?? '')}>
                    {row[header] !== null && row[header] !== undefined ? String(row[header]) : <span className="text-zinc-300 dark:text-zinc-700 italic">null</span>}
                  </td>
                ))}
              </tr>
            ))}
            {dataset.data.length === 0 && (
              <tr>
                <td colSpan={filteredHeaders.length + 1} className="px-4 py-8 text-center text-zinc-500 italic">
                  No preview data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
