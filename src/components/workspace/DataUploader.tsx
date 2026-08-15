import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, Database, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { processDataset } from '@/lib/analyzer';
import { createDemoDataset } from '@/lib/demoData';
import { Dataset } from '@/types';
import { Button } from '../ui/button';

interface DataUploaderProps {
  onDatasetsImported: (datasets: Dataset[], replaceFilenames?: string[]) => void;
  existingDatasets?: Dataset[];
  compact?: boolean;
}

interface ProcessingState {
  filename: string;
  type: string;
  size: number;
  progress: number;
}

interface QueuedFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
  datasetsCreated?: number;
}

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function DataUploader({ onDatasetsImported, existingDatasets = [], compact = false }: DataUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [processingFile, setProcessingFile] = useState<ProcessingState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [uploadQueue, setUploadQueue] = useState<QueuedFile[] | null>(null);
  const [importComplete, setImportComplete] = useState(false);
  const [processedDatasets, setProcessedDatasets] = useState<Dataset[]>([]);
  const [duplicateConflict, setDuplicateConflict] = useState<string[]>([]);
  const [replaces, setReplaces] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDemoData = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUploading(true);
    setErrorMessage(null);
    setProcessingFile({
      filename: 'demo_sales_analytics.csv',
      type: 'CSV',
      size: 18400,
      progress: 45
    });

    try {
      setTimeout(() => {
        setProcessingFile(prev => prev ? { ...prev, progress: 85 } : null);
      }, 300);

      const dataset = await createDemoDataset();
      setProcessingFile(prev => prev ? { ...prev, progress: 100 } : null);
      
      setTimeout(() => {
        onDatasetsImported([dataset]);
        setIsUploading(false);
        setProcessingFile(null);
      }, 200);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || 'Failed to generate demo dataset.');
      setIsUploading(false);
      setProcessingFile(null);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleFiles = (files: FileList) => {
    setErrorMessage(null);
    const fileList = Array.from(files);

    if (fileList.length === 0) return;

    const newQueue: QueuedFile[] = fileList.map(f => {
      const isValid = !!f.name.match(/\.(csv|xlsx?|json|txt|pdf|png|jpe?g)$/i);
      return {
        id: Math.random().toString(36).substring(2, 11),
        file: f,
        status: isValid ? 'pending' : 'error',
        errorMessage: isValid ? undefined : 'Unsupported format'
      };
    });

    setUploadQueue(newQueue);
    setImportComplete(false);
    setProcessedDatasets([]);
    setReplaces([]);
    
    if (existingDatasets.length > 0) {
      const existingNames = new Set(existingDatasets.map(d => d.filename));
      const conflicts = fileList.filter(f => existingNames.has(f.name)).map(f => f.name);
      if (conflicts.length > 0) {
        setDuplicateConflict(conflicts);
      } else {
        setDuplicateConflict([]);
      }
    } else {
      setDuplicateConflict([]);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleCancelQueue = () => {
    setUploadQueue(null);
    setImportComplete(false);
    setProcessedDatasets([]);
  };

  const handleImportQueue = async () => {
    if (!uploadQueue) return;
    
    setIsUploading(true);
    let newDatasets: Dataset[] = [];
    let currentQueue = [...uploadQueue];
    
    for (let i = 0; i < currentQueue.length; i++) {
      const item = currentQueue[i];
      if (item.status !== 'pending') continue;
      
      // Update status to processing
      currentQueue = currentQueue.map((q, idx) => idx === i ? { ...q, status: 'processing' } : q);
      setUploadQueue(currentQueue);
      
      try {
        if (item.file.size === 0) throw new Error("File is empty (0 bytes)");
        
        const datasets = await processDataset(item.file);
        newDatasets = newDatasets.concat(datasets);
        
        currentQueue = currentQueue.map((q, idx) => idx === i ? { ...q, status: 'success', datasetsCreated: datasets.length } : q);
        setUploadQueue(currentQueue);
      } catch (err: any) {
        currentQueue = currentQueue.map((q, idx) => idx === i ? { ...q, status: 'error', errorMessage: err.message || 'Failed to parse' } : q);
        setUploadQueue(currentQueue);
      }
    }
    
    setProcessedDatasets(newDatasets);
    setIsUploading(false);
    setImportComplete(true);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  if (uploadQueue) {
    const pendingCount = uploadQueue.filter(q => q.status === 'pending').length;
    const errorCount = uploadQueue.filter(q => q.status === 'error').length;
    const successCount = uploadQueue.filter(q => q.status === 'success').length;
    
    if (duplicateConflict.length > 0) {
      return (
        <div className="w-full space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-amber-200 dark:border-amber-900/50 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-amber-900 dark:text-amber-100">
                  Duplicate Files Detected
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  You are attempting to import files that already exist in your workspace. How would you like to proceed?
                </p>
                <div className="mt-3 space-y-1">
                  {duplicateConflict.map(name => (
                    <div key={name} className="text-[11px] font-mono text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded inline-block mr-2 mb-1">
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-zinc-950 flex flex-wrap gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCancelQueue}>
                Cancel Import
              </Button>
              <Button variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900/30" onClick={() => {
                setDuplicateConflict([]);
                setReplaces([]); // Keep both
              }}>
                Keep Both
              </Button>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => {
                setReplaces(duplicateConflict);
                setDuplicateConflict([]);
              }}>
                Replace Existing
              </Button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="w-full space-y-3 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {importComplete ? 'Import Complete' : 'Ready to Import'}
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {importComplete 
                  ? `${uploadQueue.length} files processed • ${successCount} successful • ${errorCount} failed` 
                  : `${uploadQueue.length} files • ${pendingCount} supported • ${errorCount} skipped`}
              </p>
            </div>
            {importComplete && (
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded">
                {processedDatasets.length} datasets created
              </div>
            )}
          </div>
          
          <div className="max-h-[300px] overflow-auto custom-scrollbar p-1.5 space-y-1">
            {uploadQueue.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg text-xs transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileSpreadsheet className={cn(
                    "w-4 h-4 shrink-0", 
                    item.status === 'success' ? "text-emerald-500" : item.status === 'error' ? "text-red-400" : "text-zinc-400"
                  )} />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium text-zinc-700 dark:text-zinc-300">{item.file.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{formatBytes(item.file.size)}</span>
                  </div>
                </div>
                <div className="shrink-0 ml-4 flex items-center justify-end min-w-[80px]">
                  {item.status === 'pending' && <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Waiting</span>}
                  {item.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                  {item.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {item.status === 'error' && (
                    <span className="text-red-500 text-[10px] bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-1.5 py-0.5 rounded shadow-sm max-w-[120px] truncate" title={item.errorMessage}>
                      {item.errorMessage}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex justify-end gap-2">
            {importComplete ? (
              <Button size="sm" onClick={() => onDatasetsImported(processedDatasets, replaces)}>
                Finish & View Workspace
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleCancelQueue} disabled={isUploading}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleImportQueue} disabled={isUploading || pendingCount === 0}>
                  {isUploading ? 'Importing...' : 'Import All'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="flex items-start justify-between gap-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-md text-xs text-red-700 dark:text-red-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Import Error</span>
              <p>{errorMessage}</p>
            </div>
          </div>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="text-red-400 hover:text-red-700 dark:hover:text-red-200 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Drag-and-Drop Box */}
      <div
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
          e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center border border-dashed rounded-2xl transition-all cursor-pointer overflow-hidden bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md interactive-glow interactive-glow-bg group shadow-3xs",
          compact ? "p-6" : "p-12",
          isDragging 
            ? "border-blue-500 dark:border-blue-400 bg-blue-50/30 dark:bg-blue-950/20 scale-[1.005] ring-4 ring-blue-500/10 dark:ring-blue-400/10 shadow-[0_8px_30px_rgba(59,130,246,0.12)]" 
            : "border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/15 dark:hover:bg-zinc-900/5 hover:-translate-y-[1px] hover:shadow-md",
          isUploading && "pointer-events-none opacity-90 border-blue-500/50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/json, text/plain, application/pdf, image/png, image/jpeg"
          className="hidden"
          onChange={handleChange}
          disabled={isUploading}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory="true"
          directory="true"
          multiple
          className="hidden"
          onChange={handleChange}
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center text-center space-y-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100/80 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs animate-float group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-300">
            <UploadCloud className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>

          <div>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 transition-colors">
              {isDragging ? "Drop your data here to begin." : "Drag and drop your spreadsheet here"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {isDragging ? "Release mouse button to import instantly" : "or click to browse local files"}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="text-xs h-9 px-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-semibold shadow-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 hover-elevate transition-all duration-200 rounded-lg cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('webkitdirectory');
                    fileInputRef.current.click();
                  }
                }}
              >
                Browse Files
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="text-xs h-9 px-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-semibold shadow-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 hover-elevate transition-all duration-200 rounded-lg cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (folderInputRef.current) {
                    folderInputRef.current.click();
                  }
                }}
              >
                Upload Folder
              </Button>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 tracking-wider uppercase pt-1">
              <span>Supported Formats:</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-650 dark:text-zinc-400 font-bold">.CSV</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-650 dark:text-zinc-400 font-bold">.XLSX</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-650 dark:text-zinc-400 font-bold">.JSON</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-650 dark:text-zinc-400 font-bold">.TXT</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-650 dark:text-zinc-400 font-bold">.PDF / IMG</span>
            </div>
          </div>
      </div>

      {!compact && !isUploading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { icon: <Database className="w-4 h-4 text-zinc-400" />, label: "PostgreSQL", status: "Coming Soon" },
            { icon: <Database className="w-4 h-4 text-zinc-400" />, label: "MySQL", status: "Coming Soon" },
            { icon: <FileSpreadsheet className="w-4 h-4 text-zinc-400" />, label: "Google Sheets", status: "Coming Soon" },
            { icon: <Database className="w-4 h-4 text-zinc-400" />, label: "Salesforce", status: "Coming Soon" }
          ].map((connector, i) => (
            <div key={i} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 opacity-60 cursor-not-allowed">
              {connector.icon}
              <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">{connector.label}</span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-mono">{connector.status}</span>
            </div>
          ))}
        </div>
      )}

      {!compact && !isUploading && (
        <div className="flex items-center justify-center gap-2.5 text-xs py-3.5 border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl px-4 text-zinc-500">
          <Database className="w-4 h-4 text-blue-500 shrink-0" />
          <span>Want to test-drive the suite first?</span>
          <button 
            type="button"
            onClick={handleDemoData}
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-all cursor-pointer flex items-center gap-1"
          >
            Load Demo Sales Analytics Dataset
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase tracking-widest ml-0.5">
              DEMO
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
