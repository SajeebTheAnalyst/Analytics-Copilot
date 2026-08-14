import { DashboardShareInfo } from '@/types';

/**
 * Generates a shareable URL pointing directly to a dashboard and optional saved view.
 */
export function generateDashboardShareUrl(
  dashboardId: string,
  savedViewId?: string
): string {
  try {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const url = new URL(`${origin}${pathname}`);
    url.searchParams.set('tab', 'dashboards');
    url.searchParams.set('id', dashboardId);
    if (savedViewId) {
      url.searchParams.set('view', savedViewId);
    }
    return url.toString();
  } catch (err) {
    // Fallback if URL constructor fails in rare environments
    const base = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    const params = [`tab=dashboards`, `id=${encodeURIComponent(dashboardId)}`];
    if (savedViewId) {
      params.push(`view=${encodeURIComponent(savedViewId)}`);
    }
    return `${base}?${params.join('&')}`;
  }
}

/**
 * Copies a string to clipboard using modern Clipboard API with fallback.
 */
export async function copyShareLinkToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard API failed, attempting textarea fallback:', err);
  }

  // Fallback using temporary textarea
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy command failed:', err);
    return false;
  }
}

/**
 * Parses query parameters to see if a specific dashboard and saved view were linked.
 */
export function parseDashboardShareParams(
  search: string = window.location.search
): { dashboardId: string | null; savedViewId: string | null } {
  try {
    const params = new URLSearchParams(search);
    const dashboardId = params.get('id');
    const savedViewId = params.get('view');
    return { dashboardId, savedViewId };
  } catch {
    return { dashboardId: null, savedViewId: null };
  }
}
