import { WidgetConfig } from '@/types';

export interface WidgetLayout {
  x: number; // 0..11
  y: number; // 0..N
  w: number; // 1..12
  h: number; // 1..N
}

/**
  * Check if two layout rectangles overlap
  */
export function isOverlapping(a: WidgetLayout, b: WidgetLayout): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/**
  * Get minimum allowed width and height for a widget type
  */
export function getMinDimensions(type: string): { minW: number; minH: number } {
  if (type === 'kpi') {
    return { minW: 2, minH: 2 };
  }
  if (type === 'table' || type === 'matrix' || type === 'ranking_table') {
    return { minW: 3, minH: 3 };
  }
  return { minW: 3, minH: 3 };
}

/**
  * Get a valid layout for a widget, computing defaults if missing.
  * Clamps x and y strictly within canvas bounds without altering relative position.
  */
export function getValidLayout(widget: WidgetConfig, indexFallback: number = 0, cols: number = 12): WidgetLayout {
  const { minW, minH } = getMinDimensions(widget.type);

  if (
    widget.layout &&
    typeof widget.layout.x === 'number' &&
    typeof widget.layout.y === 'number' &&
    typeof widget.layout.w === 'number' &&
    typeof widget.layout.h === 'number' &&
    !isNaN(widget.layout.x) &&
    !isNaN(widget.layout.y) &&
    !isNaN(widget.layout.w) &&
    !isNaN(widget.layout.h)
  ) {
    const w = Math.max(minW, Math.min(cols, widget.layout.w));
    const h = Math.max(minH, widget.layout.h);
    const x = Math.max(0, Math.min(cols - w, widget.layout.x));
    const y = Math.max(0, widget.layout.y);
    return { x, y, w, h };
  }

  // Fallback from gridSpan or widget type
  let defaultW = 6;
  let defaultH = 4;

  if (widget.type === 'kpi') {
    defaultW = widget.gridSpan ? Math.min(12, widget.gridSpan * 3) : 3;
    defaultH = 2;
  } else if (widget.gridSpan) {
    defaultW = Math.min(12, widget.gridSpan * 3);
    defaultH = widget.gridSpan === 4 ? 5 : 4;
  }

  defaultW = Math.max(minW, Math.min(cols, defaultW));
  defaultH = Math.max(minH, defaultH);

  // Auto layout fallback based on index fallback
  const itemsPerRow = Math.max(1, Math.floor(cols / defaultW));
  const row = Math.floor(indexFallback / itemsPerRow);
  const col = (indexFallback % itemsPerRow) * defaultW;

  return {
    x: col,
    y: row * defaultH,
    w: defaultW,
    h: defaultH
  };
}

/**
  * Find the first available position in a grid that doesn't overlap existing items
  */
export function findFirstAvailablePosition(
  placed: WidgetLayout[],
  w: number,
  h: number,
  cols: number = 12
): { x: number; y: number } {
  let y = 0;
  while (y < 1000) {
    for (let x = 0; x <= cols - w; x++) {
      const candidate: WidgetLayout = { x, y, w, h };
      const hasOverlap = placed.some(p => isOverlapping(candidate, p));
      if (!hasOverlap) {
        return { x, y };
      }
    }
    y++;
  }
  return { x: 0, y: 0 };
}

/**
  * Resolve grid collisions and compact layout deterministically.
  * Ensures no two widgets overlap and activeWidget maintains priority.
  */
export function compactLayout(
  widgets: WidgetConfig[],
  activeWidgetId?: string,
  cols: number = 12
): WidgetConfig[] {
  if (!widgets || widgets.length === 0) return [];

  // Create local working copy with valid layouts
  const items = widgets.map((w, idx) => ({
    ...w,
    layout: getValidLayout(w, idx, cols)
  }));

  // Sort items top-to-bottom, then left-to-right
  items.sort((a, b) => {
    if (a.layout!.y !== b.layout!.y) return a.layout!.y - b.layout!.y;
    return a.layout!.x - b.layout!.x;
  });

  const placed: { id: string; layout: WidgetLayout }[] = [];
  const result: WidgetConfig[] = [];

  for (const item of items) {
    let l = { ...item.layout! };
    const { minW, minH } = getMinDimensions(item.type);

    l.w = Math.max(minW, Math.min(cols, l.w));
    l.x = Math.max(0, Math.min(cols - l.w, l.x));
    l.h = Math.max(minH, l.h);
    l.y = Math.max(0, l.y);

    if (item.id === activeWidgetId) {
      // Active item gets priority. If it overlaps with previously placed, push other items down or shift
      let hasCollision = true;
      while (hasCollision) {
        hasCollision = placed.some(p => isOverlapping(l, p.layout));
        if (hasCollision) {
          l.y += 1;
        }
      }
    } else {
      // Non-active item: compact upward as far as possible without overlapping
      let currentY = l.y;
      while (currentY > 0) {
        const testLayout = { ...l, y: currentY - 1 };
        const overlaps = placed.some(p => isOverlapping(testLayout, p.layout));
        if (overlaps) break;
        currentY--;
      }
      l.y = currentY;

      // Ensure no collision with active or previously placed item
      while (placed.some(p => isOverlapping(l, p.layout))) {
        l.y += 1;
      }
    }

    placed.push({ id: item.id, layout: l });
    result.push({
      ...item,
      layout: l
    });
  }

  return result;
}
