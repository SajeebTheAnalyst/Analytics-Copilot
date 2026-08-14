import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { DashboardExportOptions } from '@/types';

export interface DashboardExportMetadata {
  title: string;
  subtitle?: string;
  savedViewName?: string;
  filterSummary?: string[];
  drillSummary?: string[];
  kpiSummary?: Array<{ title: string; value: string | number; change?: string; trend?: 'up' | 'down' | 'neutral' }>;
  generatedAt?: number;
}

/**
 * Sanitizes a title and saved view name for a safe, professional filename.
 */
export function generateExportFilename(
  title: string,
  savedViewName?: string,
  extension: 'png' | 'pdf' = 'png'
): string {
  const cleanTitle = (title || 'Dashboard')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_');

  const cleanView = savedViewName
    ? `_${savedViewName.trim().replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_')}`
    : '';

  const dateStr = new Date().toISOString().slice(0, 10);
  return `${cleanTitle}${cleanView}_${dateStr}.${extension}`;
}

/**
 * Exports the dashboard DOM element as a high-resolution PNG image.
 */
export async function exportDashboardAsPng(
  containerEl: HTMLElement,
  options: DashboardExportOptions,
  metadata: DashboardExportMetadata,
  onProgress?: (status: string) => void
): Promise<void> {
  onProgress?.('Preparing dashboard canvas...');

  // Create temporary wrapper with executive export header if enabled
  const exportWrapper = document.createElement('div');
  exportWrapper.className = 'export-capture-container';
  exportWrapper.style.position = 'fixed';
  exportWrapper.style.left = '-9999px';
  exportWrapper.style.top = '0';
  exportWrapper.style.width = `${Math.max(containerEl.scrollWidth || 1280, 1280)}px`;
  exportWrapper.style.backgroundColor = options.theme === 'dark' ? '#09090b' : '#ffffff';
  exportWrapper.style.color = options.theme === 'dark' ? '#f4f4f5' : '#09090b';
  exportWrapper.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  exportWrapper.style.padding = '28px';
  exportWrapper.style.boxSizing = 'border-box';

  // Apply light/dark styling classes
  if (options.theme === 'dark') {
    exportWrapper.classList.add('dark');
  }

  // Header element
  const headerDiv = document.createElement('div');
  headerDiv.style.marginBottom = '20px';
  headerDiv.style.borderBottom = options.theme === 'dark' ? '1px solid #27272a' : '1px solid #e4e4e7';
  headerDiv.style.paddingBottom = '16px';

  const titleText = options.customTitle || metadata.title || 'Analytics Dashboard';
  const subtitleText = options.customSubtitle || metadata.subtitle;

  let headerHtml = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
      <div>
        <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 4px 0; color: ${options.theme === 'dark' ? '#ffffff' : '#0f172a'};">${titleText}</h1>
        ${subtitleText ? `<p style="font-size: 13px; color: ${options.theme === 'dark' ? '#a1a1aa' : '#64748b'}; margin: 0;">${subtitleText}</p>` : ''}
      </div>
      <div style="text-align: right;">
        ${metadata.savedViewName ? `<div style="display: inline-block; background: ${options.theme === 'dark' ? '#1e293b' : '#eff6ff'}; color: ${options.theme === 'dark' ? '#93c5fd' : '#2563eb'}; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; border: 1px solid ${options.theme === 'dark' ? '#3b82f640' : '#bfdbfe'}; margin-bottom: 4px;">View: ${metadata.savedViewName}</div>` : ''}
        ${options.includeMetadata !== false ? `<div style="font-size: 10px; color: ${options.theme === 'dark' ? '#71717a' : '#94a3b8'};">Generated on ${new Date(metadata.generatedAt || Date.now()).toLocaleString()}</div>` : ''}
      </div>
    </div>
  `;

  // Filter & Context section if enabled
  if (options.includeFilterContext && ((metadata.filterSummary && metadata.filterSummary.length > 0) || (metadata.drillSummary && metadata.drillSummary.length > 0))) {
    headerHtml += `
      <div style="margin-top: 10px; padding: 8px 12px; background: ${options.theme === 'dark' ? '#18181b' : '#f8fafc'}; border-radius: 8px; border: 1px solid ${options.theme === 'dark' ? '#27272a' : '#e2e8f0'}; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <span style="font-size: 11px; font-weight: 600; color: ${options.theme === 'dark' ? '#a1a1aa' : '#475569'};">Active Filters:</span>
        ${(metadata.filterSummary || []).map(f => `<span style="font-size: 10px; background: ${options.theme === 'dark' ? '#27272a' : '#e2e8f0'}; color: ${options.theme === 'dark' ? '#e4e4e7' : '#1e293b'}; padding: 2px 8px; border-radius: 4px; font-weight: 500;">${f}</span>`).join('')}
        ${(metadata.drillSummary || []).map(d => `<span style="font-size: 10px; background: ${options.theme === 'dark' ? '#312e81' : '#ede9fe'}; color: ${options.theme === 'dark' ? '#c7d2fe' : '#6366f1'}; padding: 2px 8px; border-radius: 4px; font-weight: 500;">Drill: ${d}</span>`).join('')}
      </div>
    `;
  }

  // Executive KPI summary section if enabled
  if (options.includeKpiSummary && metadata.kpiSummary && metadata.kpiSummary.length > 0) {
    headerHtml += `
      <div style="margin-top: 14px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
        ${metadata.kpiSummary.map(k => `
          <div style="padding: 10px 14px; background: ${options.theme === 'dark' ? '#18181b' : '#f8fafc'}; border: 1px solid ${options.theme === 'dark' ? '#27272a' : '#e2e8f0'}; border-radius: 8px;">
            <div style="font-size: 11px; color: ${options.theme === 'dark' ? '#a1a1aa' : '#64748b'}; font-weight: 500; margin-bottom: 2px;">${k.title}</div>
            <div style="font-size: 18px; font-weight: 700; color: ${options.theme === 'dark' ? '#ffffff' : '#0f172a'};">${k.value}</div>
            ${k.change ? `<div style="font-size: 10px; font-weight: 600; color: ${k.trend === 'up' ? '#10b981' : k.trend === 'down' ? '#ef4444' : '#64748b'}; margin-top: 2px;">${k.change}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  headerDiv.innerHTML = headerHtml;
  exportWrapper.appendChild(headerDiv);

  // Clone main container content to avoid mutating live interactive UI
  const clonedContent = containerEl.cloneNode(true) as HTMLElement;

  // Strip all interactive handles, action buttons, modals, and builder controls from the clone
  const elementsToRemove = clonedContent.querySelectorAll(
    'button, .resize-handle, .drag-handle, input, select, .no-export, [role="dialog"], .action-toolbar'
  );
  elementsToRemove.forEach(el => el.remove());

  // Ensure charts and widgets retain full visibility
  clonedContent.style.overflow = 'visible';
  clonedContent.style.width = '100%';
  clonedContent.style.height = 'auto';

  exportWrapper.appendChild(clonedContent);
  document.body.appendChild(exportWrapper);

  try {
    onProgress?.('Rendering visuals into high-resolution image...');
    
    // Scale factor: 2x for crisp high-resolution output
    const scale = options.scale || 2;

    const canvas = await html2canvas(exportWrapper, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: options.theme === 'dark' ? '#09090b' : '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: exportWrapper.scrollWidth,
      windowHeight: exportWrapper.scrollHeight
    });

    onProgress?.('Finalizing PNG download...');
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const filename = generateExportFilename(metadata.title, metadata.savedViewName, 'png');

    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  } finally {
    if (document.body.contains(exportWrapper)) {
      document.body.removeChild(exportWrapper);
    }
  }
}

/**
 * Exports the dashboard DOM element as a high-quality PDF.
 */
export async function exportDashboardAsPdf(
  containerEl: HTMLElement,
  options: DashboardExportOptions,
  metadata: DashboardExportMetadata,
  onProgress?: (status: string) => void
): Promise<void> {
  onProgress?.('Preparing dashboard for PDF generation...');

  const orientation = options.orientation || 'landscape';
  const pageSize = options.pageSize || 'a4';
  const isLandscape = orientation === 'landscape';

  // Create temporary wrapper with executive styling
  const exportWrapper = document.createElement('div');
  exportWrapper.className = 'export-pdf-capture-container';
  exportWrapper.style.position = 'fixed';
  exportWrapper.style.left = '-9999px';
  exportWrapper.style.top = '0';
  exportWrapper.style.width = isLandscape ? '1400px' : '1000px';
  exportWrapper.style.backgroundColor = options.theme === 'dark' ? '#09090b' : '#ffffff';
  exportWrapper.style.color = options.theme === 'dark' ? '#f4f4f5' : '#09090b';
  exportWrapper.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  exportWrapper.style.padding = '32px';
  exportWrapper.style.boxSizing = 'border-box';

  if (options.theme === 'dark') {
    exportWrapper.classList.add('dark');
  }

  // Header element
  const headerDiv = document.createElement('div');
  headerDiv.style.marginBottom = '20px';
  headerDiv.style.borderBottom = options.theme === 'dark' ? '1px solid #27272a' : '1px solid #e4e4e7';
  headerDiv.style.paddingBottom = '16px';

  const titleText = options.customTitle || metadata.title || 'Analytics Dashboard';
  const subtitleText = options.customSubtitle || metadata.subtitle;

  let headerHtml = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
      <div>
        <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 4px 0; color: ${options.theme === 'dark' ? '#ffffff' : '#0f172a'};">${titleText}</h1>
        ${subtitleText ? `<p style="font-size: 13px; color: ${options.theme === 'dark' ? '#a1a1aa' : '#64748b'}; margin: 0;">${subtitleText}</p>` : ''}
      </div>
      <div style="text-align: right;">
        ${metadata.savedViewName ? `<div style="display: inline-block; background: ${options.theme === 'dark' ? '#1e293b' : '#eff6ff'}; color: ${options.theme === 'dark' ? '#93c5fd' : '#2563eb'}; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; border: 1px solid ${options.theme === 'dark' ? '#3b82f640' : '#bfdbfe'}; margin-bottom: 4px;">View: ${metadata.savedViewName}</div>` : ''}
        ${options.includeMetadata !== false ? `<div style="font-size: 10px; color: ${options.theme === 'dark' ? '#71717a' : '#94a3b8'};">Generated on ${new Date(metadata.generatedAt || Date.now()).toLocaleString()}</div>` : ''}
      </div>
    </div>
  `;

  // Filter section
  if (options.includeFilterContext && ((metadata.filterSummary && metadata.filterSummary.length > 0) || (metadata.drillSummary && metadata.drillSummary.length > 0))) {
    headerHtml += `
      <div style="margin-top: 10px; padding: 8px 12px; background: ${options.theme === 'dark' ? '#18181b' : '#f8fafc'}; border-radius: 8px; border: 1px solid ${options.theme === 'dark' ? '#27272a' : '#e2e8f0'}; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <span style="font-size: 11px; font-weight: 600; color: ${options.theme === 'dark' ? '#a1a1aa' : '#475569'};">Active Filters:</span>
        ${(metadata.filterSummary || []).map(f => `<span style="font-size: 10px; background: ${options.theme === 'dark' ? '#27272a' : '#e2e8f0'}; color: ${options.theme === 'dark' ? '#e4e4e7' : '#1e293b'}; padding: 2px 8px; border-radius: 4px; font-weight: 500;">${f}</span>`).join('')}
        ${(metadata.drillSummary || []).map(d => `<span style="font-size: 10px; background: ${options.theme === 'dark' ? '#312e81' : '#ede9fe'}; color: ${options.theme === 'dark' ? '#c7d2fe' : '#6366f1'}; padding: 2px 8px; border-radius: 4px; font-weight: 500;">Drill: ${d}</span>`).join('')}
      </div>
    `;
  }

  // Executive KPI summary
  if (options.includeKpiSummary && metadata.kpiSummary && metadata.kpiSummary.length > 0) {
    headerHtml += `
      <div style="margin-top: 14px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
        ${metadata.kpiSummary.map(k => `
          <div style="padding: 10px 14px; background: ${options.theme === 'dark' ? '#18181b' : '#f8fafc'}; border: 1px solid ${options.theme === 'dark' ? '#27272a' : '#e2e8f0'}; border-radius: 8px;">
            <div style="font-size: 11px; color: ${options.theme === 'dark' ? '#a1a1aa' : '#64748b'}; font-weight: 500; margin-bottom: 2px;">${k.title}</div>
            <div style="font-size: 18px; font-weight: 700; color: ${options.theme === 'dark' ? '#ffffff' : '#0f172a'};">${k.value}</div>
            ${k.change ? `<div style="font-size: 10px; font-weight: 600; color: ${k.trend === 'up' ? '#10b981' : k.trend === 'down' ? '#ef4444' : '#64748b'}; margin-top: 2px;">${k.change}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  headerDiv.innerHTML = headerHtml;
  exportWrapper.appendChild(headerDiv);

  // Clone content
  const clonedContent = containerEl.cloneNode(true) as HTMLElement;
  const elementsToRemove = clonedContent.querySelectorAll(
    'button, .resize-handle, .drag-handle, input, select, .no-export, [role="dialog"], .action-toolbar'
  );
  elementsToRemove.forEach(el => el.remove());

  clonedContent.style.overflow = 'visible';
  clonedContent.style.width = '100%';
  clonedContent.style.height = 'auto';

  exportWrapper.appendChild(clonedContent);
  document.body.appendChild(exportWrapper);

  try {
    onProgress?.('Rendering visuals for PDF...');
    const scale = 2; // high-dpi capture

    const canvas = await html2canvas(exportWrapper, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: options.theme === 'dark' ? '#09090b' : '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: exportWrapper.scrollWidth,
      windowHeight: exportWrapper.scrollHeight
    });

    onProgress?.('Generating PDF document...');

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10; // 10mm margin

    const contentWidth = pageWidth - (margin * 2);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgHeight / imgWidth;
    const contentHeight = contentWidth * ratio;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // If fits on one page
    if (contentHeight <= (pageHeight - (margin * 2))) {
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);
    } else {
      // Multi-page PDF slicing if content is long
      let heightLeft = contentHeight;
      let position = margin;
      let pageNum = 1;

      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
      heightLeft -= (pageHeight - (margin * 2));

      while (heightLeft > 0) {
        position = -((pageNum * (pageHeight - (margin * 2))) - margin);
        pdf.addPage(pageSize, orientation);
        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
        heightLeft -= (pageHeight - (margin * 2));
        pageNum++;
      }
    }

    const filename = generateExportFilename(metadata.title, metadata.savedViewName, 'pdf');
    pdf.save(filename);
  } finally {
    if (document.body.contains(exportWrapper)) {
      document.body.removeChild(exportWrapper);
    }
  }
}

/**
 * Triggers clean browser print dialog with styling optimized for paper/PDF printing.
 */
export function printDashboard(): void {
  window.print();
}
