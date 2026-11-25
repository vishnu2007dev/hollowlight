import { formatTime } from './director';

/** Public address of the game; shared links carry ?ref=share so analytics can count them. */
export const SITE_URL = 'https://game.hollowlight.workers.dev/';
export const SHARE_URL = `${SITE_URL}?ref=share`;

export interface ShareInput {
  score: number;
  won: boolean;
  time: number;
  /** e.g. "Normal · 10 min" */
  mode: string;
  newBest: boolean;
}

/** The text players share after a run. Kept short so it fits a post or a chat message. */
export function shareText(r: ShareInput): string {
  const score = Math.round(r.score).toLocaleString('en-US');
  const result = r.won ? 'held back the dark until dawn' : `survived ${formatTime(r.time)}`;
  const best = r.newBest ? ' (new personal best!)' : '';
  return `🏮 I ${result} in Hollowlight and scored ${score}${best} on ${r.mode}. Can you beat it?\n${SHARE_URL}`;
}
