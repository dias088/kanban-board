import { describe, expect, it } from 'vitest';
import {
  MIN_POSITION_GAP,
  POSITION_STEP,
  needsRebalance,
  positionBetween,
  rebalancedPosition,
} from '../lib/position';

describe('positionBetween', () => {
  it('starts an empty list at one step', () => {
    expect(positionBetween(null, null)).toBe(POSITION_STEP);
  });

  it('appends one step past the last item', () => {
    expect(positionBetween(4096, null)).toBe(4096 + POSITION_STEP);
  });

  it('halves the first position when inserting at the top', () => {
    expect(positionBetween(null, 1024)).toBe(512);
  });

  it('takes the midpoint between two neighbours', () => {
    expect(positionBetween(1024, 2048)).toBe(1536);
  });

  it('always lands strictly between its neighbours', () => {
    const position = positionBetween(1024, 1025);

    expect(position).toBeGreaterThan(1024);
    expect(position).toBeLessThan(1025);
  });
});

describe('needsRebalance', () => {
  it('never asks to renumber when appending to the end', () => {
    expect(needsRebalance(Number.MAX_SAFE_INTEGER, null)).toBe(false);
  });

  it('accepts a healthy gap', () => {
    expect(needsRebalance(1024, 2048)).toBe(false);
  });

  it('rejects a gap that can no longer be split', () => {
    expect(needsRebalance(1024, 1024 + MIN_POSITION_GAP / 2)).toBe(true);
  });

  it('treats a missing lower neighbour as zero, catching a crowded top', () => {
    expect(needsRebalance(null, MIN_POSITION_GAP / 2)).toBe(true);
  });

  it('reaches the renumbering threshold after about thirty inserts into one gap', () => {
    const after = 0;
    let before: number = POSITION_STEP;
    let inserts = 0;

    while (!needsRebalance(after, before) && inserts < 1000) {
      // Each insert lands in the same gap, which keeps halving it
      before = positionBetween(after, before);
      inserts += 1;
    }

    expect(needsRebalance(after, before)).toBe(true);
    expect(inserts).toBeGreaterThan(25);
    expect(inserts).toBeLessThan(35);
  });
});

describe('rebalancedPosition', () => {
  it('spreads items one step apart starting at one step', () => {
    expect([0, 1, 2].map(rebalancedPosition)).toEqual([
      POSITION_STEP,
      POSITION_STEP * 2,
      POSITION_STEP * 3,
    ]);
  });
});
