/**
 * Ordering of columns and cards uses fractional indexing: instead of
 * renumbering a whole list on every move, an item gets a position halfway
 * between its two neighbours. A move is then a single-row update.
 *
 * The price is that repeatedly dropping items into the same gap halves it every
 * time, and a float64 eventually runs out of room. Once a gap gets smaller than
 * MIN_POSITION_GAP the list is renumbered, which takes about 30 consecutive
 * inserts into the exact same spot.
 */

/** Distance between neighbours in a freshly numbered list. */
export const POSITION_STEP = 1024;

/** Below this gap float64 midpoints stop being trustworthy. */
export const MIN_POSITION_GAP = 1e-6;

/**
 * Position for an item dropped between two neighbours.
 *
 * `after` is the item it lands below (a smaller position), `before` the item it
 * lands above. A missing `after` means the top of the list, a missing `before`
 * means the end, and both missing means the list is empty.
 */
export function positionBetween(after: number | null, before: number | null): number {
  if (before === null) {
    return (after ?? 0) + POSITION_STEP;
  }

  return ((after ?? 0) + before) / 2;
}

/**
 * Whether the gap is too small to split again. Appending to the end always has
 * room, so only gaps bounded on the upper side can force a renumbering. A
 * missing lower neighbour counts as 0, which also catches the case of an
 * insertion at the very top of an already crowded list.
 */
export function needsRebalance(after: number | null, before: number | null): boolean {
  if (before === null) {
    return false;
  }

  return before - (after ?? 0) < MIN_POSITION_GAP;
}

/** Position of the item at `index` once a list has been renumbered. */
export function rebalancedPosition(index: number): number {
  return (index + 1) * POSITION_STEP;
}
