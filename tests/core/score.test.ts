import { describe, expect, it } from 'vitest';
import {
  breakCombo,
  COMBO_MAX,
  COMBO_STEP,
  COMBO_WINDOW,
  comboMultiplier,
  DAWN_BONUS,
  finalScore,
  KILL_POINTS,
  newScore,
  scoreKill,
  scoreWisp,
  tickCombo,
  WISP_POINTS,
} from '../../src/core/score';

describe('score', () => {
  it('combo multiplier steps up every COMBO_STEP kills and caps', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(COMBO_STEP - 1)).toBe(1);
    expect(comboMultiplier(COMBO_STEP)).toBe(1.5);
    expect(comboMultiplier(COMBO_STEP * 2)).toBe(2);
    expect(comboMultiplier(100_000)).toBe(COMBO_MAX);
  });

  it('kills score their base points and build the chain', () => {
    const s = newScore();
    expect(scoreKill(s, 'chaser')).toBe(KILL_POINTS.chaser);
    expect(s.chain).toBe(1);
    expect(s.comboTimer).toBe(COMBO_WINDOW);
    for (let i = 1; i < COMBO_STEP - 1; i++) scoreKill(s, 'chaser');
    // The kill that reaches COMBO_STEP is already multiplied.
    expect(scoreKill(s, 'chaser')).toBe(KILL_POINTS.chaser * 1.5);
  });

  it('the combo drops after the window or on a hit, keeping the best chain', () => {
    const s = newScore();
    scoreKill(s, 'runner');
    scoreKill(s, 'runner');
    tickCombo(s, COMBO_WINDOW - 0.1);
    expect(s.chain).toBe(2);
    tickCombo(s, 0.2);
    expect(s.chain).toBe(0);
    scoreKill(s, 'runner');
    breakCombo(s);
    expect(s.chain).toBe(0);
    expect(s.bestChain).toBe(2);
  });

  it('wisps are worth far more than a kill and feed the combo', () => {
    const s = newScore();
    expect(scoreWisp(s)).toBe(WISP_POINTS);
    expect(s.wisps).toBe(1);
    expect(s.chain).toBeGreaterThan(1);
    expect(WISP_POINTS).toBeGreaterThan(KILL_POINTS.brute * 5);
  });

  it('final score adds survival and dawn bonuses, scaled by difficulty', () => {
    const s = newScore();
    scoreKill(s, 'brute');
    scoreWisp(s);
    const won = finalScore(s, { elapsed: 300.7, won: true, runLength: 'short', difficulty: 'normal' });
    expect(won.survival).toBe(3000);
    expect(won.dawn).toBe(DAWN_BONUS.short);
    expect(won.total).toBe(s.killPoints + s.wispPoints + 3000 + DAWN_BONUS.short);
    const lost = finalScore(s, { elapsed: 300.7, won: false, runLength: 'short', difficulty: 'normal' });
    expect(lost.dawn).toBe(0);
    const easy = finalScore(s, { elapsed: 300.7, won: true, runLength: 'short', difficulty: 'easy' });
    expect(easy.total).toBeLessThan(won.total);
  });
});
