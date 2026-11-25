import { describe, expect, it } from 'vitest';
import { SHARE_URL, shareText } from '../../src/core/share';

describe('shareText', () => {
  const base = { score: 12345.4, won: false, time: 452, mode: 'Normal · 10 min', newBest: false };

  it('includes the score, survival time, mode and a tracked link', () => {
    const t = shareText(base);
    expect(t).toContain('12,345');
    expect(t).toContain('survived 7:32');
    expect(t).toContain('Normal · 10 min');
    expect(t.endsWith(SHARE_URL)).toBe(true);
    expect(SHARE_URL).toContain('ref=share');
  });

  it('celebrates a win and a new best', () => {
    const t = shareText({ ...base, won: true, newBest: true });
    expect(t).toContain('until dawn');
    expect(t).toContain('new personal best');
    expect(t).not.toContain('survived');
  });

  it('stays short enough for a post', () => {
    expect(shareText({ ...base, won: true, newBest: true }).length).toBeLessThan(200);
  });
});
