import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, Database, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { processDataset } from '@/lib/analyzer';
import { createDemoDataset } from '@/lib/demoData';
import { Dataset } from '@/types';
import { Button } from '../ui/button';

interface DataUploaderProps {
  onDatasetsImported: (datasets: Dataset[]) => void;
  compact?: boolean;
}

interface ProcessingState {
  filename: string;
  type: string;
  size: number;
  progress: number;
}

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function DataUploader({ onDatasetsImported, compact = false }: DataUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [processingFile, setProcessingFile] = useState<ProcessingState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFiles = async (files: FileList) => {
    setErrorMessage(null);
    const fileList = Array.from(files);

    if (fileList.length === 0) return;

    // Validate file extensions
    const invalidFiles = fileList.filter(f => !f.name.match(/\.(csv|xlsx?)$/i));
    if (invalidFiles.length > 0) {
      setErrorMessage(`Invalid file format: "${invalidFiles[0].name}". Please upload a valid CSV or XLSX spreadsheet.`);
      return;
    }

    setIsUploading(true);

    try {
      const processedDatasets: Dataset[] = [];
      
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        
        // Validate file size > 0
        if (file.size === 0) {
          throw new Error(`The file "${file.name}" is empty (0 bytes).`);
        }

        setProcessingFile({
          filename: file.name,
          type: file.name.endsWith('.csv') ? 'CSV' : 'XLSX',
          size: file.size,
          progress: Math.round(((i + 0.5) / fileList.length) * 100)
        });

        const dataset = await processDataset(file);
        
        if (!dataset.headers || dataset.headers.length === 0) {
          throw new Error(`Failed to detect columns in "${file.name}". Ensure the file contains headers.`);
        }

        processedDatasets.push(dataset);
      }

      setProcessingFile(prev => prev ? { ...prev, progress: 100 } : null);
      
      setTimeout(() => {
        onDatasetsImported(processedDatasets);
        setIsUploading(false);
        setProcessingFile(null);
      }, 200);

    } catch (error: any) {
      console.error("Error processing files:", error);
      setErrorMessage(error.message || "Failed to process the uploaded file. Please verify file structure.");
      setIsUploading(false);
      setProcessingFile(null);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
        className={cn(
          "relative flex flex-col items-center justify-center border border-dashed rounded-md transition-all cursor-pointer overflow-hidden bg-white dark:bg-zinc-950",
          compact ? "p-6" : "p-10",
          isDragging 
            ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 scale-[1.005]" 
            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40",
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
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          className="hidden"
          onChange={handleChange}
          disabled={isUploading}
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center text-center space-y-3 w-full max-w-sm">
            <div className="w-10 h-10 rounded-md bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                <span className="truncate max-w-[200px]">{processingFile?.filename || 'Processing file...'}</span>
                <span className="text-zinc-400 font-mono text-[11px]">{processingFile?.progress}%</span>
              </div>
              
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${processingFile?.progress || 10}%` }}
                />
              </div>

              {processingFile && (
                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 font-mono">
                  <span>Type: {processingFile.type}</span>
                  <span>Size: {formatBytes(processingFile.size)}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium animate-pulse">
              Parsing schema and compiling column profiles...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-650 dark:text-blue-400 shadow-3xs">
              <UploadCloud className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Drag and drop your spreadsheet here
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                or click to browse local files
              </p>
            </div>

            <div className="flex items-center gap-3 pt-0.5">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="text-xs h-8 px-4 border-zinc-300 dark:border-zinc-700 font-semibold shadow-3xs"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Browse Files
              </Button>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 tracking-wider uppercase pt-1">
              <span>Supported Formats:</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-300">.CSV</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-300">.XLSX</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-300">.XLS</span>
            </div>
          </div>
        )}
      </div>

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
