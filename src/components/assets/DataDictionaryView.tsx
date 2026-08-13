import React, { useState, useEffect, useMemo } from 'react';
import { Dataset, KpiDefinition, Dashboard } from '@/types';
import { getSavedKpis } from '@/lib/kpiStorage';
import { getSavedMisReports, MisReportConfig } from '@/lib/misReportStorage';
import { calculateDatasetHealth } from '@/lib/profiler';
import { 
  getSavedColumnMetadata, 
  saveColumnMetadata, 
  syncAndMarkStaleMetadata, 
  getColumnMetaKey, 
  ColumnMetadata 
} from '@/lib/dataDictionaryStorage';
import { 
  DictionaryColumnItem, 
  SemanticType, 
  TechnicalDataType, 
  QualityStatus, 
  inferSemanticType, 
  calculateQualityStatus, 
  normalizeTechnicalType, 
  computeColumnStatistics, 
  deriveColumnUsage, 
  exportDictionaryToCsv 
} from '@/lib/dataDictionaryEngine';
import { 
  BookOpen, Search, Filter, Database, Hash, Calendar, Tag, CheckCircle2, 
  AlertTriangle, AlertCircle, Sparkles, Download, RefreshCw, X, Plus, 
  FileText, BarChart2, Check, Layers, Info, Edit3, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Markdown from 'react-markdown';

interface DataDictionaryViewProps {
  datasets: Dataset[];
  dashboards?: Dashboard[];
}

const PRESET_TAGS = ['Financial', 'KPI', 'Customer', 'Dimension', 'Identifier', 'Date', 'Operations', 'Compliance'];

export function DataDictionaryView({ datasets, dashboards = [] }: DataDictionaryViewProps) {
  // State
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSemanticType, setFilterSemanticType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMissing, setFilterMissing] = useState<string>('all');
  const [filterDescription, setFilterDescription] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');

  // Metadata & Storage
  const [metadataMap, setMetadataMap] = useState<Record<string, ColumnMetadata>>({});
  const [savedKpis, setSavedKpis] = useState<KpiDefinition[]>([]);
  const [savedMisReports, setSavedMisReports] = useState<MisReportConfig[]>([]);

  // Drawer & Detail View State
  const [selectedColumn, setSelectedColumn] = useState<DictionaryColumnItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<'governance' | 'technical'>('governance');
  
  // Editing state in Drawer
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSemanticType, setEditSemanticType] = useState<SemanticType>('Dimension');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // AI Explanation state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Load Saved Metadata, KPIs, MIS Reports on mount
  useEffect(() => {
    async function initDictionaryData() {
      const kpis = await getSavedKpis();
      setSavedKpis(kpis);

      const mis = await getSavedMisReports();
      setSavedMisReports(mis);

      const syncedMeta = await syncAndMarkStaleMetadata(datasets);
      setMetadataMap(syncedMeta);
    }
    initDictionaryData();
  }, [datasets]);

  // Sync Drawer editing fields when selectedColumn changes
  useEffect(() => {
    if (selectedColumn) {
      setEditDescription(selectedColumn.description || '');
      setEditNotes(selectedColumn.businessNotes || '');
      setEditSemanticType(selectedColumn.semanticType);
      setEditTags(selectedColumn.tags || []);
      setCustomTagInput('');
      setAiExplanation(null);
      setAiError(null);
      setDrawerTab('governance');
    }
  }, [selectedColumn]);

  // Selected Dataset Reference
  const activeDatasetObj = useMemo(() => {
    if (selectedDatasetId === 'all') return null;
    return datasets.find(d => d.id === selectedDatasetId) || null;
  }, [datasets, selectedDatasetId]);

  // Process & Assemble All Dictionary Column Items
  const allDictionaryColumns: DictionaryColumnItem[] = useMemo(() => {
    const list: DictionaryColumnItem[] = [];

    // Process Active Datasets
    for (const dataset of datasets) {
      const fullRows = dataset.fullData && dataset.fullData.length > 0 ? dataset.fullData : dataset.data || [];
      const totalRows = dataset.rowCount || fullRows.length;

      for (const header of dataset.headers || []) {
        const metaKey = getColumnMetaKey(dataset.id, header);
        const storedMeta = metadataMap[metaKey];

        const profile = dataset.columnProfiles?.[header] || {
          name: header,
          type: dataset.columnTypes?.[header] || 'unknown',
          nullCount: 0,
          uniqueCount: 0,
          exampleValue: null
        };

        const techType = normalizeTechnicalType(profile.type);
        const nullCount = profile.nullCount || 0;
        const uniqueCount = profile.uniqueCount || 0;
        
        const completenessPercent = totalRows > 0 ? Math.max(0, Math.min(100, ((totalRows - nullCount) / totalRows) * 100)) : 100;
        const distinctRatioPercent = totalRows > 0 ? Math.round((uniqueCount / totalRows) * 1000) / 10 : 0;
        const status = calculateQualityStatus(completenessPercent);

        // Samples
        const validSamples = fullRows
          .map(r => r[header])
          .filter(v => v !== null && v !== undefined && v !== '')
          .slice(0, 5)
          .map(v => String(v));

        if (validSamples.length === 0 && profile.exampleValue !== null && profile.exampleValue !== undefined) {
          validSamples.push(String(profile.exampleValue));
        }

        // Semantic type
        const inferredSemantic = inferSemanticType(header, techType, uniqueCount, totalRows, validSamples);
        const semanticType = (storedMeta?.semanticTypeOverride as SemanticType) || inferredSemantic;

        // Stats
        const statistics = computeColumnStatistics(fullRows, header, techType);

        // Usage
        const usedIn = deriveColumnUsage(dataset.id, header, savedKpis, dashboards, savedMisReports);

        list.push({
          key: metaKey,
          datasetId: dataset.id,
          datasetName: dataset.name,
          columnName: header,
          technicalType: techType,
          semanticType,
          completenessPercent,
          nullCount,
          uniqueCount,
          totalRows,
          distinctRatioPercent,
          sampleValues: validSamples,
          status,
          description: storedMeta?.description || '',
          businessNotes: storedMeta?.businessNotes || '',
          tags: storedMeta?.tags || [],
          isStale: false,
          statistics,
          usedIn
        });
      }
    }

    // Process Stale Metadata (Columns from deleted datasets or dropped columns)
    for (const [key, meta] of Object.entries(metadataMap)) {
      if (meta.isStale) {
        // Check if already included
        if (!list.some(item => item.key === key)) {
          list.push({
            key,
            datasetId: meta.datasetId,
            datasetName: meta.datasetName || 'Legacy Dataset',
            columnName: meta.columnName,
            technicalType: 'Text',
            semanticType: (meta.semanticTypeOverride as SemanticType) || 'Dimension',
            completenessPercent: 0,
            nullCount: 0,
            uniqueCount: 0,
            totalRows: 0,
            distinctRatioPercent: 0,
            sampleValues: [],
            status: 'Critical',
            description: meta.description || '',
            businessNotes: meta.businessNotes || '',
            tags: meta.tags || [],
            isStale: true,
            statistics: {},
            usedIn: []
          });
        }
      }
    }

    return list;
  }, [datasets, metadataMap, savedKpis, dashboards, savedMisReports]);

  // Extract all unique tags across columns for tag filter
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    allDictionaryColumns.forEach(c => c.tags.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [allDictionaryColumns]);

  // Filtered Columns
  const filteredColumns = useMemo(() => {
    return allDictionaryColumns.filter(col => {
      // Dataset filter
      if (selectedDatasetId !== 'all' && col.datasetId !== selectedDatasetId) return false;

      // Search term (Column Name, Dataset Name, Description, Notes, Tags)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesCol = col.columnName.toLowerCase().includes(query);
        const matchesDs = col.datasetName.toLowerCase().includes(query);
        const matchesDesc = col.description.toLowerCase().includes(query);
        const matchesNotes = col.businessNotes.toLowerCase().includes(query);
        const matchesTag = col.tags.some(t => t.toLowerCase().includes(query));

        if (!matchesCol && !matchesDs && !matchesDesc && !matchesNotes && !matchesTag) {
          return false;
        }
      }

      // Technical Data Type
      if (filterType !== 'all' && col.technicalType !== filterType) return false;

      // Semantic Type
      if (filterSemanticType !== 'all' && col.semanticType !== filterSemanticType) return false;

      // Quality Status
      if (filterStatus !== 'all' && col.status !== filterStatus) return false;

      // Missing Values
      if (filterMissing === 'has_missing' && col.nullCount === 0) return false;
      if (filterMissing === 'no_missing' && col.nullCount > 0) return false;

      // Description Status
      if (filterDescription === 'has_description' && !col.description) return false;
      if (filterDescription === 'missing_description' && col.description) return false;

      // Tag Filter
      if (filterTag === 'tagged' && col.tags.length === 0) return false;
      if (filterTag === 'untagged' && col.tags.length > 0) return false;
      if (filterTag !== 'all' && filterTag !== 'tagged' && filterTag !== 'untagged' && !col.tags.includes(filterTag)) return false;

      return true;
    });
  }, [
    allDictionaryColumns, 
    selectedDatasetId, 
    searchTerm, 
    filterType, 
    filterSemanticType, 
    filterStatus, 
    filterMissing, 
    filterDescription, 
    filterTag
  ]);

  const hasActiveFilters = Boolean(
    searchTerm || 
    selectedDatasetId !== 'all' || 
    filterType !== 'all' || 
    filterSemanticType !== 'all' || 
    filterStatus !== 'all' || 
    filterMissing !== 'all' || 
    filterDescription !== 'all' || 
    filterTag !== 'all'
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedDatasetId('all');
    setFilterType('all');
    setFilterSemanticType('all');
    setFilterStatus('all');
    setFilterMissing('all');
    setFilterDescription('all');
    setFilterTag('all');
  };

  // Save Business Metadata Handler (Persists in IndexedDB without touching dataset)
  const handleSaveMetadata = async () => {
    if (!selectedColumn) return;

    const updatedMeta: ColumnMetadata = {
      datasetId: selectedColumn.datasetId,
      datasetName: selectedColumn.datasetName,
      columnName: selectedColumn.columnName,
      description: editDescription,
      businessNotes: editNotes,
      semanticTypeOverride: editSemanticType,
      tags: editTags,
      updatedAt: Date.now()
    };

    const newMap = await saveColumnMetadata(updatedMeta);
    setMetadataMap(newMap);

    // Update current selectedColumn state in memory
    setSelectedColumn(prev => prev ? {
      ...prev,
      description: editDescription,
      businessNotes: editNotes,
      semanticType: editSemanticType,
      tags: editTags
    } : null);

    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 2000);
  };

  // Add Tag Helper
  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags([...editTags, trimmed]);
      setCustomTagInput('');
    }
  };

  // Remove Tag Helper
  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(t => t !== tagToRemove));
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    const csvContent = exportDictionaryToCsv(filteredColumns);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `data_dictionary_${selectedDatasetId === 'all' ? 'all_datasets' : activeDatasetObj?.name || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // AI Column Explanation Handler
  const handleExplainColumnWithAi = async () => {
    if (!selectedColumn) return;
    setIsAiLoading(true);
    setAiError(null);

    const payload = {
      columnName: selectedColumn.columnName,
      datasetName: selectedColumn.datasetName,
      technicalType: selectedColumn.technicalType,
      semanticType: selectedColumn.semanticType,
      completenessPercent: `${selectedColumn.completenessPercent.toFixed(1)}%`,
      missingCount: selectedColumn.nullCount,
      uniqueCount: selectedColumn.uniqueCount,
      totalRows: selectedColumn.totalRows,
      distinctRatio: `${selectedColumn.distinctRatioPercent}%`,
      sampleValues: selectedColumn.sampleValues,
      statistics: selectedColumn.statistics,
      existingDescription: selectedColumn.description || 'None provided',
      usedIn: selectedColumn.usedIn.map(u => `${u.type}: ${u.name}`)
    };

    const prompt = `Please provide a clear, professional Data Governance Column Interpretation for the dataset field "${selectedColumn.columnName}".

Structured Column Metadata:
${JSON.stringify(payload, null, 2)}

Provide a structured response in Markdown with 3 short bulleted sections:
1. **Business Interpretation**: What this field represents in business operations.
2. **Recommended Analytical Uses**: How analysts should leverage this column in KPIs or Dashboards.
3. **Data Quality & Governance Concerns**: Potential anomalies or missing value risks based on completeness and statistics.`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          metadata: { dataDictionary: payload },
          history: []
        })
      });

      if (!response.ok) throw new Error('AI Service request failed');
      const data = await response.json();
      if (data.text) {
        setAiExplanation(data.text);
      } else {
        throw new Error('Received empty response from AI service');
      }
    } catch (err: any) {
      console.warn('AI Explanation fallback triggered:', err);
      const fallback = `### 1. **Business Interpretation**
The field **"${selectedColumn.columnName}"** serves as a **${selectedColumn.semanticType}** attribute within the **${selectedColumn.datasetName}** dataset.

### 2. **Recommended Analytical Uses**
- **Data Modeling**: Utilize as a ${selectedColumn.semanticType === 'Measure' ? 'numeric target for aggregations (SUM, AVG)' : 'grouping dimension for drill-downs'}.
- **Reporting**: Incorporate into MIS Executive Reports and Dashboard filters.

### 3. **Data Quality & Governance Concerns**
- **Completeness**: Currently at **${selectedColumn.completenessPercent.toFixed(1)}%** with **${selectedColumn.nullCount.toLocaleString()}** null values.
- **Cardinality**: **${selectedColumn.uniqueCount.toLocaleString()}** distinct entries (${selectedColumn.distinctRatioPercent}% distinct ratio).`;
      setAiExplanation(fallback);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Type Badge Helper
  const renderTypeBadge = (techType: TechnicalDataType) => {
    switch (techType) {
      case 'Numeric':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40"><Hash className="w-3 h-3" /> Numeric</span>;
      case 'Date':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"><Calendar className="w-3 h-3" /> Date</span>;
      case 'Boolean':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40"><CheckCircle2 className="w-3 h-3" /> Boolean</span>;
      case 'Categorical':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40"><Tag className="w-3 h-3" /> Categorical</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"><FileText className="w-3 h-3" /> Text</span>;
    }
  };

  // Quality Status Badge Helper
  const renderStatusBadge = (status: QualityStatus) => {
    switch (status) {
      case 'Healthy':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40"><CheckCircle2 className="w-3 h-3" /> Healthy</span>;
      case 'Needs Attention':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40"><AlertTriangle className="w-3 h-3" /> Needs Attention</span>;
      case 'Critical':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900/40"><AlertCircle className="w-3 h-3" /> Critical</span>;
    }
  };

  // Selected Dataset Metrics
  const datasetSummaryMetrics = useMemo(() => {
    if (activeDatasetObj) {
      const healthSummary = calculateDatasetHealth(activeDatasetObj);

      return {
        name: activeDatasetObj.name,
        rows: activeDatasetObj.rowCount,
        cols: activeDatasetObj.colCount || activeDatasetObj.headers.length,
        fileType: activeDatasetObj.type.toUpperCase(),
        health: healthSummary.score
      };
    } else {
      const totalRows = datasets.reduce((acc, d) => acc + d.rowCount, 0);
      const totalCols = allDictionaryColumns.length;
      const avgHealth = datasets.length > 0
        ? Math.round(datasets.reduce((acc, d) => acc + calculateDatasetHealth(d).score, 0) / datasets.length)
        : 100;
      return {
        name: `All Datasets (${datasets.length})`,
        rows: totalRows,
        cols: totalCols,
        fileType: 'WORKSPACE',
        health: avgHealth
      };
    }
  }, [activeDatasetObj, datasets, allDictionaryColumns]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-transparent p-4 sm:p-6 space-y-6">
      
      {/* PAGE HEADER */}
      <div className="glass-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Data Dictionary</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Understand dataset structure, field quality, types, and business metadata.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredColumns.length === 0}
            className="text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
            Export Data Dictionary (CSV)
          </Button>
        </div>
      </div>

      {datasets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 max-w-md mx-auto my-12">
          <BookOpen className="w-10 h-10 text-zinc-400 mb-3" />
          <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">No Dataset Assets Uploaded</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Import datasets in the Data Workspace to automatically populate column definitions, quality metrics, and business governance metadata.
          </p>
        </div>
      ) : (
        <>
          {/* DATASET GOVERNANCE SUMMARY BANNER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Dataset Selector */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-2.5 shadow-3xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Target Dataset</span>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer shadow-3xs"
              >
                <option value="all">All Workspace Datasets ({datasets.length})</option>
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Total Rows */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shadow-3xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Record Volume</span>
              <p className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-50 mt-1">{datasetSummaryMetrics.rows.toLocaleString()} <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-555">Rows</span></p>
            </div>

            {/* Total Columns */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shadow-3xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Column Count</span>
              <p className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-50 mt-1">{datasetSummaryMetrics.cols} <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-555">Fields</span></p>
            </div>

            {/* File Type */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shadow-3xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Format & File Type</span>
              <p className="text-sm font-extrabold font-mono text-blue-600 dark:text-blue-400 uppercase mt-1.5">{datasetSummaryMetrics.fileType}</p>
            </div>

            {/* Dataset Health Score */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shadow-3xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Governance Health</span>
              <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{datasetSummaryMetrics.health}%</p>
            </div>

          </div>

          {/* GLOBAL SEARCH & MULTI-FILTER BAR */}
          <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4.5 space-y-4 shadow-3xs">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
              
              {/* Search Bar */}
              <div className="flex items-center gap-2.5 bg-zinc-50/50 dark:bg-zinc-900/50 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 flex-1">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search columns, dataset, description, compliance or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-zinc-400 hover:text-red-500 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Count & Clear Filters */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900/30 px-3 py-1 rounded-lg">
                    {filteredColumns.length} of {allDictionaryColumns.length} Fields Match
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}

            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs pt-1">
              
              {/* Technical Type Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Data Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="Text">Text</option>
                  <option value="Numeric">Numeric</option>
                  <option value="Date">Date</option>
                  <option value="Categorical">Categorical</option>
                  <option value="Boolean">Boolean</option>
                </select>
              </div>

              {/* Semantic Type Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Semantic Type</label>
                <select
                  value={filterSemanticType}
                  onChange={(e) => setFilterSemanticType(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer"
                >
                  <option value="all">All Semantics</option>
                  <option value="Identifier">Identifier</option>
                  <option value="Date">Date</option>
                  <option value="Currency">Currency</option>
                  <option value="Percentage">Percentage</option>
                  <option value="Measure">Measure</option>
                  <option value="Dimension">Dimension</option>
                  <option value="Category">Category</option>
                  <option value="Free Text">Free Text</option>
                </select>
              </div>

              {/* Quality Status Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Quality Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Healthy">Healthy (≥95%)</option>
                  <option value="Needs Attention">Needs Attention (80-94%)</option>
                  <option value="Critical">Critical (&lt;80%)</option>
                </select>
              </div>

              {/* Has Missing Values Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Missing Values</label>
                <select
                  value={filterMissing}
                  onChange={(e) => setFilterMissing(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer"
                >
                  <option value="all">All Fields</option>
                  <option value="has_missing">Has Missing Values</option>
                  <option value="no_missing">100% Complete</option>
                </select>
              </div>

              {/* Description Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Description</label>
                <select
                  value={filterDescription}
                  onChange={(e) => setFilterDescription(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer"
                >
                  <option value="all">All Fields</option>
                  <option value="has_description">Has Description</option>
                  <option value="missing_description">Missing Description</option>
                </select>
              </div>

              {/* Tags Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Taxonomy Tag</label>
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer"
                >
                  <option value="all">All Tags</option>
                  <option value="tagged">Tagged</option>
                  <option value="untagged">Untagged</option>
                  {availableTags.map(t => (
                    <option key={t} value={t}>Tag: {t}</option>
                  ))}
                </select>
              </div>

            </div>

          </div>

          {/* COLUMN METADATA TABLE */}
          <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-3xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50/70 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-4 font-extrabold">Column Name</th>
                    <th className="py-3 px-4 font-extrabold">Dataset</th>
                    <th className="py-3 px-4 font-extrabold">Data Type</th>
                    <th className="py-3 px-4 font-extrabold">Semantic Type</th>
                    <th className="py-3 px-4 font-extrabold">Completeness</th>
                    <th className="py-3 px-4 text-right font-extrabold">Missing</th>
                    <th className="py-3 px-4 text-right font-extrabold">Unique</th>
                    <th className="py-3 px-4 font-extrabold">Sample Values</th>
                    <th className="py-3 px-4 font-extrabold">Status</th>
                    <th className="py-3 px-4 font-extrabold">Used In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800/40">
                  {filteredColumns.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-14 text-center text-zinc-500 text-xs font-semibold">
                        No columns match your search or active filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredColumns.map((col) => (
                      <tr 
                        key={col.key} 
                        onClick={() => setSelectedColumn(col)}
                        className="hover:bg-zinc-50/40 dark:hover:bg-zinc-900/30 transition-all duration-150 cursor-pointer group"
                      >
                        {/* Column Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-[13px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {col.columnName}
                            </span>
                            {col.isStale && (
                              <span className="text-[9px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 px-1.5 py-0.2 rounded">Stale</span>
                            )}
                          </div>
                          {col.description ? (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[280px] mt-0.5">{col.description}</p>
                          ) : (
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic mt-0.5">Click to add description</p>
                          )}
                        </td>

                        {/* Dataset Name */}
                        <td className="py-3 px-4 font-semibold text-zinc-600 dark:text-zinc-400">
                          <span className="inline-flex items-center gap-1.5">
                            <Database className="w-3 h-3 text-zinc-400 shrink-0" />
                            {col.datasetName}
                          </span>
                        </td>

                        {/* Technical Type */}
                        <td className="py-3 px-4">
                          {renderTypeBadge(col.technicalType)}
                        </td>

                        {/* Semantic Type */}
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            {col.semanticType}
                          </span>
                        </td>

                        {/* Completeness Bar */}
                        <td className="py-3 px-4 min-w-[130px]">
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  col.completenessPercent >= 95 ? "bg-emerald-500" : col.completenessPercent >= 80 ? "bg-amber-500" : "bg-red-500"
                                )}
                                style={{ width: `${col.completenessPercent}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold text-zinc-600 dark:text-zinc-300 w-10 text-right">
                              {col.completenessPercent.toFixed(1)}%
                            </span>
                          </div>
                        </td>

                        {/* Missing Count */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-zinc-700 dark:text-zinc-300">
                          {col.nullCount.toLocaleString()}
                        </td>

                        {/* Unique Count */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-zinc-700 dark:text-zinc-300">
                          {col.uniqueCount.toLocaleString()}
                        </td>

                        {/* Sample Values */}
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[180px]">
                          {col.sampleValues.length > 0 ? col.sampleValues.slice(0, 3).join(', ') : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {renderStatusBadge(col.status)}
                        </td>

                        {/* Usage Indicators */}
                        <td className="py-3 px-4">
                          {col.usedIn.length === 0 ? (
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Unused</span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {col.usedIn.map((u, i) => (
                                <span key={i} className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                                  {u.type}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* COLUMN DETAILS DRAWER / MODAL */}
      {selectedColumn && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex justify-end animate-fade-in no-print">
          <div className="w-full max-w-xl bg-white dark:bg-[#09090b] h-full border-l border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50 font-mono tracking-tight">
                    {selectedColumn.columnName}
                  </h2>
                  {renderStatusBadge(selectedColumn.status)}
                </div>
                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5 font-medium">
                  <Database className="w-3.5 h-3.5 text-zinc-400" /> Dataset: <span className="text-zinc-700 dark:text-zinc-300 font-bold">{selectedColumn.datasetName}</span>
                </p>
              </div>

              <button 
                onClick={() => setSelectedColumn(null)} 
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Tab Bar Selector */}
            <div className="px-5 py-2.5 bg-zinc-50/30 dark:bg-zinc-950/20 border-b border-zinc-150 dark:border-zinc-850 flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setDrawerTab('governance')}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                  drawerTab === 'governance' 
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-3xs border border-zinc-200/60 dark:border-zinc-800" 
                    : "text-zinc-450 hover:text-zinc-750 dark:hover:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30"
                )}
              >
                <Tag className="w-3.5 h-3.5" />
                Governance & Context
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('technical')}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                  drawerTab === 'technical' 
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-3xs border border-zinc-200/60 dark:border-zinc-800" 
                    : "text-zinc-450 hover:text-zinc-750 dark:hover:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30"
                )}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Schema & Profile
              </button>
            </div>

            {/* Drawer Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-xs">
              
              {/* Save Success Banner */}
              {saveSuccessToast && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-750 dark:text-emerald-400 p-3 rounded-lg flex items-center gap-2.5 animate-fade-in shadow-3xs">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">Business metadata successfully persisted in IndexedDB!</span>
                </div>
              )}

              {/* TAB 1: GOVERNANCE & CONTEXT */}
              {drawerTab === 'governance' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* EDITABLE BUSINESS DESCRIPTION + INTEGRATED CONTEXTUAL AI TRIGGER */}
                  <div className="space-y-2.5 bg-zinc-50/50 dark:bg-zinc-900/20 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Business Description
                      </label>
                      
                      {/* Contextual AI Explain Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExplainColumnWithAi}
                        disabled={isAiLoading}
                        className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/40 text-[10px] font-bold px-2 py-0.5 h-6.5 flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                      >
                        {isAiLoading ? <RefreshCw className="w-3 h-3 animate-spin text-blue-500" /> : <Sparkles className="w-3 h-3 text-blue-500" />}
                        <span>{aiExplanation ? 'Re-Explain Field' : 'AI Explain Column'}</span>
                      </Button>
                    </div>

                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Describe what this field represents in daily business operations..."
                      rows={3}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-450 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                    />

                    {/* AI Explanation Result Section */}
                    {aiExplanation && (
                      <div className="mt-3.5 p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-2.5 text-zinc-800 dark:text-zinc-200 shadow-3xs">
                        <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/30 pb-2 text-[9px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                          <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-blue-500" /> AI Governance Interpretation</span>
                          <span>No PII Sent</span>
                        </div>
                        <div className="prose prose-xs dark:prose-invert max-w-none text-xs leading-relaxed">
                          <Markdown>{aiExplanation}</Markdown>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* EDITABLE BUSINESS NOTES */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      Business Governance & Compliance Notes
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Enter additional governance remarks, collection caveats, or specific PII sensitivity remarks..."
                      rows={2.5}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-450 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                    />
                  </div>

                  {/* EDITABLE TAGS */}
                  <div className="space-y-3 bg-zinc-50/30 dark:bg-zinc-900/10 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      Tags & Taxonomy Classification
                    </label>
                    
                    {/* Active Tag Chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {editTags.length === 0 ? (
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-550 italic">No category tags mapped</span>
                      ) : (
                        editTags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/40 shadow-3xs">
                            {tag}
                            <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 cursor-pointer ml-0.5">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Custom Tag Input + Presets */}
                    <div className="flex items-center gap-2 pt-1.5">
                      <input
                        type="text"
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag(customTagInput))}
                        placeholder="Type and press Enter to add tag..."
                        className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddTag(customTagInput)}
                        className="text-xs font-bold border-zinc-250 dark:border-zinc-800 h-8 hover:bg-zinc-50 dark:hover:bg-zinc-900 shadow-3xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1 text-zinc-500" /> Add
                      </Button>
                    </div>

                    {/* Preset Suggestions */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-zinc-400 pt-1 font-medium">
                      <span className="font-extrabold uppercase text-[9px] text-zinc-450 dark:text-zinc-500">Quick suggestions:</span>
                      {PRESET_TAGS.map(pt => (
                        <button
                          key={pt}
                          onClick={() => handleAddTag(pt)}
                          className="hover:underline hover:text-zinc-700 dark:hover:text-zinc-200 text-zinc-500 dark:text-zinc-400 cursor-pointer"
                        >
                          +{pt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SAVE METADATA BUTTON */}
                  <div className="pt-2">
                    <Button
                      onClick={handleSaveMetadata}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2.5 font-bold flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
                    >
                      <Check className="w-4 h-4" /> Save Business Metadata to IndexedDB
                    </Button>
                  </div>

                  {/* COLUMN USAGE DEPENDENCIES */}
                  <div className="space-y-3 pt-4 border-t border-zinc-150 dark:border-zinc-850">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" /> Used In Analytics Artifacts
                    </h4>

                    {selectedColumn.usedIn.length === 0 ? (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 italic p-3.5 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center bg-zinc-50/20 dark:bg-zinc-900/10">
                        This column is not currently referenced by any active KPIs, Dashboards, or MIS Reports.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedColumn.usedIn.map((use, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between shadow-3xs">
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-zinc-800 dark:text-zinc-200 block truncate">{use.name}</span>
                              {use.detail && <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{use.detail}</p>}
                            </div>
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 shrink-0">
                              {use.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 2: SCHEMA & PROFILE */}
              {drawerTab === 'technical' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* TECHNICAL & SEMANTIC TYPE CONFIGURATION */}
                  <div className="grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-900/20 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1.5">Technical Type</span>
                      <div className="pt-0.5">{renderTypeBadge(selectedColumn.technicalType)}</div>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1.5">Semantic Override</span>
                      <select
                        value={editSemanticType}
                        onChange={(e) => setEditSemanticType(e.target.value as SemanticType)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-900 dark:text-zinc-150 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="Identifier">Identifier</option>
                        <option value="Date">Date</option>
                        <option value="Currency">Currency</option>
                        <option value="Percentage">Percentage</option>
                        <option value="Measure">Measure</option>
                        <option value="Dimension">Dimension</option>
                        <option value="Category">Category</option>
                        <option value="Free Text">Free Text</option>
                      </select>
                    </div>
                  </div>

                  {/* METRIC OVERVIEW GRID */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 shadow-3xs">
                      <span className="text-[9px] uppercase font-extrabold text-zinc-400 dark:text-zinc-500 block">Completeness</span>
                      <span className="text-sm font-extrabold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 block">{selectedColumn.completenessPercent.toFixed(1)}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 shadow-3xs">
                      <span className="text-[9px] uppercase font-extrabold text-zinc-400 dark:text-zinc-500 block">Missing</span>
                      <span className="text-sm font-extrabold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 block">{selectedColumn.nullCount.toLocaleString()}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 shadow-3xs">
                      <span className="text-[9px] uppercase font-extrabold text-zinc-400 dark:text-zinc-500 block">Unique</span>
                      <span className="text-sm font-extrabold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 block">{selectedColumn.uniqueCount.toLocaleString()}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 shadow-3xs">
                      <span className="text-[9px] uppercase font-extrabold text-zinc-400 dark:text-zinc-500 block">Distinct Ratio</span>
                      <span className="text-sm font-extrabold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 block">{selectedColumn.distinctRatioPercent}%</span>
                    </div>
                  </div>

                  {/* SAMPLE VALUES */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Sample Distinct Values</h4>
                    <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-850 flex flex-wrap gap-2">
                      {selectedColumn.sampleValues.length > 0 ? (
                        selectedColumn.sampleValues.map((val, idx) => (
                          <span key={idx} className="px-2.5 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 font-mono text-[11px] text-zinc-800 dark:text-zinc-250 shadow-3xs">
                            {val}
                          </span>
                        ))
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-550 italic">No sample values available</span>
                      )}
                    </div>
                  </div>

                  {/* DETAILED STATISTICAL DISTRIBUTION SUMMARY */}
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Statistical Analysis</h4>
                    <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-850 space-y-4">
                      
                      {selectedColumn.technicalType === 'Numeric' && (
                        <div className="grid grid-cols-4 gap-2 text-center font-mono">
                          <div className="bg-white dark:bg-zinc-900/50 py-2.5 px-1.5 rounded border border-zinc-150 dark:border-zinc-850">
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block font-sans font-bold uppercase tracking-wider">Min</span>
                            <strong className="text-xs text-zinc-800 dark:text-zinc-200">{selectedColumn.statistics.min ?? 'N/A'}</strong>
                          </div>
                          <div className="bg-white dark:bg-zinc-900/50 py-2.5 px-1.5 rounded border border-zinc-150 dark:border-zinc-850">
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block font-sans font-bold uppercase tracking-wider">Max</span>
                            <strong className="text-xs text-zinc-800 dark:text-zinc-200">{selectedColumn.statistics.max ?? 'N/A'}</strong>
                          </div>
                          <div className="bg-white dark:bg-zinc-900/50 py-2.5 px-1.5 rounded border border-zinc-150 dark:border-zinc-850">
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block font-sans font-bold uppercase tracking-wider">Mean</span>
                            <strong className="text-xs text-zinc-800 dark:text-zinc-200">{selectedColumn.statistics.mean ?? 'N/A'}</strong>
                          </div>
                          <div className="bg-white dark:bg-zinc-900/50 py-2.5 px-1.5 rounded border border-zinc-150 dark:border-zinc-850">
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block font-sans font-bold uppercase tracking-wider">Median</span>
                            <strong className="text-xs text-zinc-800 dark:text-zinc-200">{selectedColumn.statistics.median ?? 'N/A'}</strong>
                          </div>
                        </div>
                      )}

                      {selectedColumn.technicalType === 'Date' && (
                        <div className="grid grid-cols-2 gap-3 text-center font-mono">
                          <div className="bg-white dark:bg-zinc-900/50 py-3 rounded border border-zinc-150 dark:border-zinc-850">
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block font-sans font-bold uppercase tracking-wider">Earliest Date</span>
                            <strong className="text-xs text-zinc-850 dark:text-zinc-150">{selectedColumn.statistics.minDate ?? 'N/A'}</strong>
                          </div>
                          <div className="bg-white dark:bg-zinc-900/50 py-3 rounded border border-zinc-150 dark:border-zinc-850">
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block font-sans font-bold uppercase tracking-wider">Latest Date</span>
                            <strong className="text-xs text-zinc-850 dark:text-zinc-150">{selectedColumn.statistics.maxDate ?? 'N/A'}</strong>
                          </div>
                        </div>
                      )}

                      {selectedColumn.statistics.topValues && selectedColumn.statistics.topValues.length > 0 ? (
                        <div className="space-y-2 pt-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">Frequency Distribution</span>
                          <div className="space-y-1.5">
                            {selectedColumn.statistics.topValues.map((tv, i) => (
                              <div key={i} className="flex items-center justify-between text-[11px] font-mono py-1 border-b border-zinc-100 dark:border-zinc-900 last:border-0">
                                <span className="truncate max-w-[200px] font-bold text-zinc-800 dark:text-zinc-250">{tv.value}</span>
                                <span className="text-zinc-500 dark:text-zinc-450 font-semibold">{tv.count.toLocaleString()} rows ({tv.percent}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        selectedColumn.technicalType === 'Text' && (
                          <div className="text-center py-2 text-zinc-400 dark:text-zinc-500 italic">
                            No discrete statistical distribution available.
                          </div>
                        )
                      )}

                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
