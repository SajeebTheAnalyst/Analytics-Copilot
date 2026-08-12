import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { processDataset } from '@/lib/analyzer';
import { Dataset } from '@/types';
import { Button } from '../ui/button';

interface DataUploaderProps {
  onDatasetsImported: (datasets: Dataset[]) => void;
}

export function DataUploader({ onDatasetsImported }: DataUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDemoData = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUploading(true);
    try {
      const demoCsv = `id,name,category,price,sales,region
1,Product A,Electronics,99.99,150,North America
2,Product B,Accessories,19.99,300,Europe
3,Product C,Electronics,149.99,80,North America
4,Product D,Clothing,49.99,200,Asia
5,Product E,Clothing,29.99,400,Europe`;

      const demoFile = new File([demoCsv], "demo_sales.csv", { type: "text/csv" });
      const dataset = await processDataset(demoFile);
      onDatasetsImported([dataset]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
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
    const validFiles = Array.from(files).filter(f => f.name.match(/\.(csv|xlsx?)$/i));
    if (validFiles.length === 0) return;

    setIsUploading(true);
    
    try {
      const processedDatasets: Dataset[] = [];
      for (const file of validFiles) {
        const dataset = await processDataset(file);
        processedDatasets.push(dataset);
      }
      onDatasetsImported(processedDatasets);
    } catch (error) {
      console.error("Error processing files:", error);
    } finally {
      setIsUploading(false);
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
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden",
        isDragging ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 scale-[1.02]" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700",
        isUploading && "pointer-events-none opacity-80"
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
        <div className="flex flex-col items-center text-center space-y-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Importing Datasets</p>
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1 animate-pulse">Parsing & Profiling...</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm transition-transform group-hover:scale-110">
            <UploadCloud className="w-8 h-8 text-zinc-500 dark:text-zinc-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Drag & Drop files to import
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              or click to browse from your computer
            </p>
          </div>
          <div className="flex items-center space-x-2 text-[11px] uppercase font-bold text-zinc-500 tracking-wider">
            <FileSpreadsheet className="w-3 h-3 text-blue-500" />
            <span>CSV</span>
            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <FileSpreadsheet className="w-3 h-3 text-emerald-500" />
            <span>XLSX</span>
          </div>
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 w-full flex justify-center">
             <Button variant="outline" size="sm" onClick={handleDemoData} className="gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                Try Demo Workspace
             </Button>
          </div>
        </div>
      )}
    </div>
  );
}
