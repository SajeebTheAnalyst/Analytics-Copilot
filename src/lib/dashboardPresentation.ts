import { Dashboard, DashboardSavedView } from '@/types';

/**
 * Request HTML element to enter native fullscreen mode.
 */
export async function requestDashboardFullscreen(element: HTMLElement): Promise<boolean> {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return true;
    } else if ((element as any).webkitRequestFullscreen) {
      await (element as any).webkitRequestFullscreen();
      return true;
    } else if ((element as any).msRequestFullscreen) {
      await (element as any).msRequestFullscreen();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Fullscreen request denied or not supported:', err);
    return false;
  }
}

/**
 * Exit native fullscreen mode safely.
 */
export async function exitDashboardFullscreen(): Promise<boolean> {
  try {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return true;
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
        return true;
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
        return true;
      }
    }
    return false;
  } catch (err) {
    console.warn('Exit fullscreen error:', err);
    return false;
  }
}

/**
 * Check if the browser is currently in fullscreen mode.
 */
export function isDashboardFullscreen(): boolean {
  return Boolean(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
}

/**
 * Resolves the ordered array of saved views for a presentation sequence.
 * If presentationSequence is defined, orders saved views according to the sequence.
 * Otherwise, falls back to all dashboard.savedViews in their created order.
 */
export function resolvePresentationSequence(
  dashboard: Dashboard
): DashboardSavedView[] {
  const allViews = dashboard.savedViews || [];
  if (allViews.length === 0) return [];

  const sequenceIds = dashboard.presentationSequence || [];
  if (sequenceIds.length === 0) {
    return allViews;
  }

  const viewMap = new Map<string, DashboardSavedView>(allViews.map(v => [v.id, v]));
  const orderedViews: DashboardSavedView[] = [];

  // Add views in sequence order
  for (const id of sequenceIds) {
    const view = viewMap.get(id);
    if (view) {
      orderedViews.push(view);
      viewMap.delete(id);
    }
  }

  // Append any views that weren't in the sequence
  for (const remainingView of viewMap.values()) {
    orderedViews.push(remainingView);
  }

  return orderedViews;
}

/**
 * Finds the index of a saved view within the presentation sequence.
 */
export function getSequenceIndex(
  sequence: DashboardSavedView[],
  activeViewId: string | null
): number {
  if (!activeViewId || sequence.length === 0) return 0;
  const idx = sequence.findIndex(v => v.id === activeViewId);
  return idx >= 0 ? idx : 0;
}

/**
 * Checks whether an event target is an interactive input (to avoid stealing keyboard shortcuts).
 */
export function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toUpperCase();
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.isContentEditable
  );
}
