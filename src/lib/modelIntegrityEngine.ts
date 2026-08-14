import { Dataset, RelationshipSuggestion } from '@/types';
import { validateRelationship } from '@/lib/relationshipDiscovery';
import { ReadinessEvaluation } from '@/lib/dataReadinessEngine';

export type ModelIntegrityStatus = 'READY' | 'NEEDS_ATTENTION' | 'BLOCKED';

export interface ModelIntegrityIssue {
  id: string;
  type: 'critical' | 'warning' | 'info';
  whatIsWrong: string;
  where: string;
  whyMatters: string;
  howToFix: string;
  relId?: string;
  datasetId?: string;
}

export interface ModelIntegrityReport {
  overallScore: number;
  status: ModelIntegrityStatus;
  activeDatasetCount: number;
  activeRelationshipCount: number;
  issues: ModelIntegrityIssue[];
  disconnectedDatasets: string[]; // IDs
}

/**
 * Deterministically evaluates the analytical model integrity
 * for MIS reporting / dashboard generation.
 */
export function evaluateModelIntegrity(
  datasets: Dataset[],
  suggestions: RelationshipSuggestion[]
): ModelIntegrityReport {
  const activeRelationships = suggestions.filter(s => s.status === 'accepted');
  const issues: ModelIntegrityIssue[] = [];
  
  // 1. Identify disconnected datasets
  const connectedDatasetIds = new Set<string>();
  activeRelationships.forEach(r => {
    connectedDatasetIds.add(r.sourceDatasetId);
    connectedDatasetIds.add(r.targetDatasetId);
  });
  
  const disconnectedDatasets = datasets
    .filter(d => !connectedDatasetIds.has(d.id))
    .map(d => d.id);

  // 2. Validate active relationships
  activeRelationships.forEach(rel => {
    const src = datasets.find(d => d.id === rel.sourceDatasetId);
    const tgt = datasets.find(d => d.id === rel.targetDatasetId);
    
    if (!src || !tgt) {
      issues.push({
        id: `missing-dataset-${rel.id}`,
        type: 'critical',
        whatIsWrong: 'Relationship references a missing dataset.',
        where: `${rel.sourceDatasetId} -> ${rel.targetDatasetId}`,
        whyMatters: 'Broken references prevent data joining.',
        howToFix: 'Review or delete the relationship.',
        relId: rel.id
      });
      return;
    }

    // Check duplicate relationships
    const dups = activeRelationships.filter(r => 
      r.id !== rel.id &&
      r.sourceDatasetId === rel.sourceDatasetId &&
      r.targetDatasetId === rel.targetDatasetId &&
      r.sourceColumn === rel.sourceColumn &&
      r.targetColumn === rel.targetColumn
    );
    if (dups.length > 0) {
      issues.push({
        id: `dup-rel-${rel.id}`,
        type: 'warning',
        whatIsWrong: 'Duplicate relationship definition.',
        where: `${src.name}.${rel.sourceColumn} -> ${tgt.name}.${rel.targetColumn}`,
        whyMatters: 'Redundant calculations might affect performance or results.',
        howToFix: 'Delete one of the duplicate relationships.',
        relId: rel.id
      });
    }

    // Run structural validation
    const val = validateRelationship(src, rel.sourceColumn, tgt, rel.targetColumn, rel.type);
    
    val.errors.forEach(err => {
      issues.push({
        id: `err-${rel.id}-${err.substring(0, 5)}`,
        type: 'critical',
        whatIsWrong: err,
        where: `${src.name}.${rel.sourceColumn} -> ${tgt.name}.${rel.targetColumn}`,
        whyMatters: 'Data will not align, breaking reporting.',
        howToFix: 'Review relationship column selections or data types.',
        relId: rel.id
      });
    });

    val.warnings.forEach(warn => {
      issues.push({
        id: `warn-${rel.id}-${warn.substring(0, 5)}`,
        type: 'warning',
        whatIsWrong: warn,
        where: `${src.name}.${rel.sourceColumn} -> ${tgt.name}.${rel.targetColumn}`,
        whyMatters: 'Potential for missing or inaccurate data in reporting.',
        howToFix: 'Review key overlap and data completeness.',
        relId: rel.id
      });
    });
  });

  // 3. Score calculation
  let score = 100;
  const criticalIssues = issues.filter(i => i.type === 'critical');
  const warningIssues = issues.filter(i => i.type === 'warning');
  
  if (criticalIssues.length > 0) score = 0;
  else if (warningIssues.length > 0) score = 60 - (warningIssues.length * 5);
  else if (disconnectedDatasets.length > 0) score = 90;

  let status: ModelIntegrityStatus = 'READY';
  if (score === 0) status = 'BLOCKED';
  else if (score < 80) status = 'NEEDS_ATTENTION';

  return {
    overallScore: Math.max(0, score),
    status,
    activeDatasetCount: datasets.length,
    activeRelationshipCount: activeRelationships.length,
    issues,
    disconnectedDatasets
  };
}

/**
 * Combined readiness gate for reporting.
 */
export function evaluateReportingReadiness(
  datasets: Dataset[],
  suggestions: RelationshipSuggestion[],
  datasetReadinessResults: Record<string, ReadinessEvaluation>
): { 
  isReady: boolean, 
  dataReady: boolean, 
  modelReady: boolean, 
  message: string 
} {
  // 1. Check Data Readiness
  let dataReady = true;
  for (const ds of datasets) {
    const readiness = datasetReadinessResults[ds.id];
    if (!readiness || readiness.status === 'BLOCKED') {
      dataReady = false;
      break;
    }
  }

  // 2. Check Model Integrity
  const modelHealth = evaluateModelIntegrity(datasets, suggestions);
  const modelReady = modelHealth.status !== 'BLOCKED';

  // 3. Combined Logic
  if (dataReady && modelReady) {
    return {
      isReady: true,
      dataReady,
      modelReady,
      message: 'Data and model are ready for reporting.'
    };
  }

  if (dataReady && !modelReady) {
    return {
      isReady: false,
      dataReady,
      modelReady,
      message: 'Data is clean, but the analytical model requires attention.'
    };
  }

  return {
    isReady: false,
    dataReady,
    modelReady,
    message: 'Reporting is blocked due to data or model issues.'
  };
}
