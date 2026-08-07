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

function checkDataOverlap(data1: any[], data2: any[], col1: string, col2: string): number {
  if (!data1.length || !data2.length) return 0;
  
  const set1 = new Set(data1.map(r => String(r[col1]).trim().toLowerCase()).filter(v => v !== 'null' && v !== 'undefined' && v !== ''));
  const set2 = new Set(data2.map(r => String(r[col2]).trim().toLowerCase()).filter(v => v !== 'null' && v !== 'undefined' && v !== ''));
  
  if (set1.size === 0 || set2.size === 0) return 0;

  let overlap = 0;
  for (const item of set1) {
    if (set2.has(item)) overlap++;
  }
  
  // Calculate Jaccard similarity or intersection over smaller set
  const intersectionOverMin = overlap / Math.min(set1.size, set2.size);
  return intersectionOverMin;
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
          const overlapScore = checkDataOverlap(ds1.data, ds2.data, col1, col2);
          if (overlapScore > 0.5) {
            confidence += 50 * overlapScore;
            reasons.push(`Significant data overlap detected`);
          } else if (overlapScore > 0.1) {
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
          } else if (!isUnique1 && isUnique2) {
            relType = 'N:1';
            confidence += 5;
            reasons.push(`"${col2}" appears to be a primary key`);
          } else {
            warnings.push(`Ambiguous many-to-many relationship`);
          }
          
          if (prof1.nullCount > 0 || prof2.nullCount > 0) {
            warnings.push(`Null values detected in key columns`);
          }
          
          if (confidence > 45) {
            suggestions.push({
              id: `${ds1.id}-${col1}-${ds2.id}-${col2}`,
              sourceDatasetId: ds1.id,
              targetDatasetId: ds2.id,
              sourceColumn: col1,
              targetColumn: col2,
              confidence: Math.min(Math.round(confidence), 99),
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
  
  // Sort by highest confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}
