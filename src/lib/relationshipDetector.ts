import { Dataset, RelationshipSuggestion } from '@/types';

function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  
  if (s1 === s2) return 1;
  
  // Basic substring matching for things like 'customer_id' and 'customerid'
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }
  
  // Custom logic for ID matches
  if (s1 === 'id' && s2.endsWith('id')) return 0.7;
  if (s2 === 'id' && s1.endsWith('id')) return 0.7;
  
  return 0;
}

function checkDataOverlap(data1: any[], data2: any[], col1: string, col2: string) {
  if (!data1.length || !data2.length) return { score: 0, missingIn1: 0, missingIn2: 0 };
  
  const set1 = new Set(data1.map(r => String(r[col1]).trim().toLowerCase()).filter(v => v !== 'null' && v !== 'undefined' && v !== ''));
  const set2 = new Set(data2.map(r => String(r[col2]).trim().toLowerCase()).filter(v => v !== 'null' && v !== 'undefined' && v !== ''));
  
  if (set1.size === 0 || set2.size === 0) return { score: 0, missingIn1: 0, missingIn2: 0 };

  let overlap = 0;
  let missingIn1 = 0;
  let missingIn2 = 0;
  
  for (const item of set1) {
    if (set2.has(item)) overlap++;
    else missingIn2++;
  }
  
  for (const item of set2) {
    if (!set1.has(item)) missingIn1++;
  }
  
  // Calculate Jaccard similarity or intersection over smaller set
  const score = overlap / Math.min(set1.size, set2.size);
  return { score, missingIn1, missingIn2 };
}

// Helper to detect cycles
function hasCycle(suggestions: RelationshipSuggestion[]): boolean {
  const adj = new Map<string, string[]>();
  for (const rel of suggestions) {
    if (!adj.has(rel.sourceDatasetId)) adj.set(rel.sourceDatasetId, []);
    adj.get(rel.sourceDatasetId)!.push(rel.targetDatasetId);
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  const isCyclic = (node: string): boolean => {
    if (!visited.has(node)) {
      visited.add(node);
      recStack.add(node);
      
      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor) && isCyclic(neighbor)) return true;
        if (recStack.has(neighbor)) return true;
      }
    }
    recStack.delete(node);
    return false;
  };

  for (const node of adj.keys()) {
    if (isCyclic(node)) return true;
  }
  return false;
}

export function detectRelationships(datasets: Dataset[]): RelationshipSuggestion[] {
  const suggestions: RelationshipSuggestion[] = [];
  
  if (datasets.length < 2) return suggestions;
  
  for (let i = 0; i < datasets.length; i++) {
    for (let j = i + 1; j < datasets.length; j++) {
      const ds1 = datasets[i];
      const ds2 = datasets[j];
      
      for (const col1 of ds1.headers) {
        const prof1 = ds1.columnProfiles[col1];
        if (!prof1 || prof1.type === 'unknown' || prof1.type === 'boolean') continue;
        
        for (const col2 of ds2.headers) {
          const prof2 = ds2.columnProfiles[col2];
          if (!prof2 || prof2.type !== prof1.type) continue;
          
          let confidence = 0;
          const reasons: string[] = [];
          const warnings: string[] = [];
          
          // 1. Name Similarity
          const nameSim = calculateSimilarity(col1, col2);
          if (nameSim > 0.8) {
            confidence += 40 * nameSim;
            reasons.push(`High column name similarity ("${col1}" and "${col2}")`);
          } else if (nameSim > 0.5) {
            confidence += 20 * nameSim;
            reasons.push(`Partial column name match ("${col1}" and "${col2}")`);
          }
          
          // 2. Data Overlap (based on sample data)
          const overlap = checkDataOverlap(ds1.data, ds2.data, col1, col2);
          if (overlap.score > 0.5) {
            confidence += 50 * overlap.score;
            reasons.push(`Significant data overlap detected`);
          } else if (overlap.score > 0.1) {
            confidence += 15;
            reasons.push(`Some shared unique values`);
          }
          
          // 3. Unique/Primary Key likelihood
          const isUnique1 = prof1.uniqueCount === ds1.rowCount;
          const isUnique2 = prof2.uniqueCount === ds2.rowCount;
          
          let relType: '1:1' | '1:N' | 'N:1' | 'N:M' = 'N:M';
          if (isUnique1 && isUnique2) {
            relType = '1:1';
            confidence += 10;
            reasons.push(`Both columns appear to be primary keys`);
          } else if (isUnique1 && !isUnique2) {
            relType = '1:N';
            confidence += 5;
            reasons.push(`"${col1}" appears to be a primary key`);
            if (overlap.missingIn1 > 0) warnings.push(`Missing Foreign Keys: Some records in "${ds2.name}" have no matching primary key in "${ds1.name}" (possible orphan records)`);
          } else if (!isUnique1 && isUnique2) {
            relType = 'N:1';
            confidence += 5;
            reasons.push(`"${col2}" appears to be a primary key`);
            if (overlap.missingIn2 > 0) warnings.push(`Missing Foreign Keys: Some records in "${ds1.name}" have no matching primary key in "${ds2.name}" (possible orphan records)`);
          } else {
            warnings.push(`Ambiguous many-to-many relationship`);
            warnings.push(`Duplicate Keys exist on both sides`);
          }
          
          if (prof1.nullCount > 0 || prof2.nullCount > 0) {
            warnings.push(`Null values detected in key columns`);
          }
          
          const finalConfidence = Math.min(Math.round(confidence), 99);
          if (finalConfidence < 60) {
            warnings.push(`Low confidence relationship`);
          }
          
          if (confidence > 45) {
            suggestions.push({
              id: `${ds1.id}-${col1}-${ds2.id}-${col2}`,
              sourceDatasetId: ds1.id,
              targetDatasetId: ds2.id,
              sourceColumn: col1,
              targetColumn: col2,
              confidence: finalConfidence,
              type: relType,
              reason: reasons.join('. '),
              status: 'pending',
              warnings
            });
          }
        }
      }
    }
  }
  
  // Detect cycle in highest confidence suggestions
  suggestions.sort((a, b) => b.confidence - a.confidence);
  
  if (hasCycle(suggestions)) {
    // Just attach a generic warning to the first one involved, or to all?
    // Let's attach to the top ones for simplicity.
    if (suggestions.length > 0) {
       suggestions.forEach(s => {
         // This is a naive way, but works for the prompt requirement "Detect possible circular relationships. Warn the user if ambiguous relationships exist."
         if (s.confidence > 70) {
           s.warnings.push(`Warning: Possible circular relationship detected in the data model`);
         }
       });
    }
  }
  
  return suggestions;
}
