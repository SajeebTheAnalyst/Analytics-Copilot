import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Dataset } from "../types";
import { isValid, parseISO } from "date-fns";
import { detectColumnSemantic } from "./dateIntelligence";

export async function parseFile(file: File): Promise<{ data: Record<string, any>[], headers: string[], sheetName?: string }[]> {
  return new Promise((resolve, reject) => {
    if (file.name.match(/\.(csv|txt)$/i)) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        worker: true,
        complete: (results) => {
          resolve([{
            data: results.data as Record<string, any>[],
            headers: results.meta.fields || []
          }]);
        },
        error: (error) => {
          reject(new Error("Failed to parse file: " + error.message));
        }
      });
    } else if (file.name.match(/\.xlsx?$/i)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          
          const sheetsData = workbook.SheetNames.map(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
            let headers: string[] = [];
            if (jsonData.length > 0) {
              headers = Object.keys(jsonData[0]);
            } else {
              const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
              if (rawMatrix.length > 0 && Array.isArray(rawMatrix[0])) {
                headers = rawMatrix[0].map(h => String(h || '').trim()).filter(Boolean);
              }
            }
            return { data: jsonData, headers, sheetName };
          });
          
          resolve(sheetsData);
        } catch (err: any) {
          reject(new Error("Failed to parse Excel file: " + err.message));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    } else if (file.name.match(/\.json$/i)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          let parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) {
             if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                 // Try to find the first array in the object
                 const arrayValue = Object.values(parsed).find(v => Array.isArray(v));
                 if (arrayValue) parsed = arrayValue;
                 else parsed = [parsed]; // wrap in array
             } else {
                 parsed = [parsed];
             }
          }
          const jsonData = parsed as Record<string, any>[];
          const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
          resolve([{ data: jsonData, headers }]);
        } catch (err: any) {
          reject(new Error("Failed to parse JSON file: " + err.message));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    } else if (file.name.match(/\.(pdf|png|jpe?g)$/i)) {
      // Return empty tabular data for unstructured formats, to be processed later in data preparation
      resolve([{ data: [], headers: [] }]);
    } else {
      reject(new Error(`Unsupported file type: ${file.name}. Supported formats: .csv, .xlsx, .xls, .json, .txt, .pdf, images`));
    }
  });
}

function determineColumnType(data: Record<string, any>[], column: string): Dataset['columnTypes'][string] {
  let numCount = 0;
  let dateCount = 0;
  let boolCount = 0;
  let validCount = 0;

  const sampleSize = Math.min(data.length, 100);
  for (let i = 0; i < sampleSize; i++) {
    const val = data[i][column];
    if (val === null || val === undefined || val === "") continue;
    
    validCount++;
    if (typeof val === "number") {
      numCount++;
    } else if (typeof val === "boolean") {
      boolCount++;
    } else if (val instanceof Date || (typeof val === "string" && isValid(parseISO(val)))) {
      dateCount++;
    } else if (typeof val === "string" && !isNaN(Number(val)) && val.trim() !== "") {
      numCount++;
    }
  }

  if (validCount === 0) return "unknown";
  if (numCount / validCount > 0.8) return "numeric";
  if (dateCount / validCount > 0.5) return "date";
  if (boolCount / validCount > 0.8) return "boolean";
  return "categorical";
}

export function recalculateDatasetProfiles(dataset: Dataset): Dataset {
  const data = dataset.fullData;
  const headers = dataset.headers;
  
  const columnTypes: Record<string, Dataset['columnTypes'][string]> = {};
  const columnProfiles: Record<string, Dataset['columnProfiles'][string]> = {};
  const columnSemanticTypes: Record<string, string> = {};
  const columnGranularities: Record<string, string> = {};

  for (const header of headers) {
    const rawType = determineColumnType(data, header);
    const semanticRes = detectColumnSemantic(data, header, rawType);
    
    columnSemanticTypes[header] = semanticRes.type;
    if (semanticRes.granularity) {
      columnGranularities[header] = semanticRes.granularity;
    }

    if (['date', 'dateTime', 'time', 'month_year', 'year', 'quarter', 'month', 'day'].includes(semanticRes.type)) {
      columnTypes[header] = 'date';
    } else {
      columnTypes[header] = rawType;
    }
    
    let nullCount = 0;
    const uniqueValues = new Set<any>();
    let exampleValue: any = null;
    
    for (const row of data) {
      const val = row[header];
      if (val === null || val === undefined || val === "") {
        nullCount++;
      } else {
        uniqueValues.add(val);
        if (exampleValue === null) {
          exampleValue = val;
        }
      }
    }

    let temporalHierarchy: any = null;
    const typeLower = String(semanticRes.type).toLowerCase();
    if (['date', 'datetime', 'month_year', 'year', 'time'].includes(typeLower)) {
      let availableLevels: string[] = [];
      if (typeLower === 'year') {
        availableLevels = ['Year'];
      } else if (typeLower === 'month_year') {
        availableLevels = ['Year', 'Month Name', 'Month Number'];
      } else if (typeLower === 'date') {
        availableLevels = ['Year', 'Quarter', 'Month Name', 'Month Number', 'Day', 'Day of Week', 'Week Number'];
      } else if (typeLower === 'datetime') {
        availableLevels = ['Year', 'Quarter', 'Month Name', 'Month Number', 'Day', 'Day of Week', 'Week Number', 'Date', 'Hour', 'Minute', 'Time'];
      } else if (typeLower === 'time') {
        availableLevels = ['Hour', 'Minute', 'Time'];
      }

      temporalHierarchy = {
        availableLevels,
      };
    }
    
    columnProfiles[header] = {
      name: header,
      type: columnTypes[header],
      nullCount,
      uniqueCount: uniqueValues.size,
      exampleValue: exampleValue instanceof Date ? exampleValue.toISOString() : exampleValue,
      temporalHierarchy,
    };
  }

  return {
    ...dataset,
    rowCount: data.length,
    data: data.slice(0, 100).map(row => {
      const newRow = { ...row };
      for (const key of Object.keys(newRow)) {
        if (newRow[key] instanceof Date) {
          newRow[key] = newRow[key].toISOString();
        }
      }
      return newRow;
    }),
    columnTypes,
    columnProfiles,
    columnSemanticTypes,
    columnGranularities
  };
}

export async function processDataset(file: File): Promise<Dataset[]> {
  const parsedResults = await parseFile(file);
  
  const datasets: Dataset[] = [];
  
  for (const { data, headers, sheetName } of parsedResults) {
    // Fallback names for TXT/JSON/CSV vs EXCEL
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const name = sheetName ? `${baseName} - ${sheetName}` : baseName;

    const skeleton: Dataset = {
      id: crypto.randomUUID(),
      name,
      filename: file.name,
      sheetName: sheetName,
      type: file.name.toLowerCase().match(/\.([a-z0-9]+)$/i)?.[1] || 'unknown',
      size: file.size,
      uploadTime: Date.now(),
      rowCount: data.length,
      colCount: headers.length,
      headers,
      data: [],
      fullData: data,
      originalData: data.map(r => ({ ...r })),
      columnTypes: {},
      columnProfiles: {},
      cleaningStatus: 'original',
      cleaningLogs: [],
      issues: []
    };

    const profiled = recalculateDatasetProfiles(skeleton);
    datasets.push(profiled);
  }

  return datasets;
}
