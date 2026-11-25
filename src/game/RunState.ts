import { playerStats, type PlayerStats } from '../core/combat';
import type { Difficulty } from '../core/difficulty';
import { RUN_LENGTHS, type RunLength } from '../core/director';
import { startingLoadout, type Loadout } from '../core/upgrades';
import { newScore, type ScoreState } from '../core/score';
import { xpToNext } from '../core/xp';

/**
 * Everything about the current run that more than one scene needs to read.
 * The Game scene owns and mutates it; the HUD and LevelUp scenes read it via the registry.
 */
export interface RunState {
  difficulty: Difficulty;
  runLength: RunLength;
  /** seconds until dawn */
  winTime: number;
  bossTimes: readonly number[];
  elapsed: number;
  kills: number;
  level: number;
  xp: number;
  xpNext: number;
  hp: number;
  loadout: Loadout;
  stats: PlayerStats;
  /** level-ups earned but not yet chosen */
  pendingLevelUps: number;
  levelUpOpen: boolean;
  userPaused: boolean;
  boss: { hp: number; maxHp: number } | null;
  over: boolean;
  score: ScoreState;
}

export function newRun(difficulty: Difficulty = 'normal', runLength: RunLength = 'long'): RunState {
  const loadout = startingLoadout();
  const stats = playerStats(loadout.passives);
  return {
    difficulty,
    runLength,
    winTime: RUN_LENGTHS[runLength].seconds,
    bossTimes: RUN_LENGTHS[runLength].bossTimes,
    elapsed: 0,
    kills: 0,
    level: 1,
    xp: 0,
    xpNext: xpToNext(1),
    hp: stats.maxHp,
    loadout,
    stats,
    pendingLevelUps: 0,
    levelUpOpen: false,
    userPaused: false,
    boss: null,
    over: false,
    score: newScore(),
  };
}

export const RUN_KEY = 'run';
