import { DIFFICULTY_IDS, isDifficulty, type Difficulty } from '../core/difficulty';
import { isRunLength, RUN_LENGTH_IDS, type RunLength } from '../core/director';

const KEY = 'hollowlight.save.v1';

export interface ModeRecord {
  bestScore: number;
  bestTime: number;
  bestKills: number;
  wins: number;
  runs: number;
}

export interface SaveData {
  /** best results, kept separately for each difficulty and run length */
  records: Record<Difficulty, Record<RunLength, ModeRecord>>;
  difficulty: Difficulty;
  runLength: RunLength;
  sound: boolean;
  shake: boolean;
}

const emptyRecord = (): ModeRecord => ({ bestScore: 0, bestTime: 0, bestKills: 0, wins: 0, runs: 0 });

const emptyLengths = (): Record<RunLength, ModeRecord> => ({ short: emptyRecord(), long: emptyRecord() });

const defaults = (): SaveData => ({
  records: { easy: emptyLengths(), normal: emptyLengths() },
  difficulty: 'normal',
  runLength: 'long',
  sound: true,
  shake: true,
});

const pickRecord = (r: unknown): ModeRecord => {
  const out = emptyRecord();
  const src = (r ?? {}) as Partial<Record<keyof ModeRecord, unknown>>;
  for (const k of Object.keys(out) as (keyof ModeRecord)[]) {
    const v = src[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
};

/**
 * Reads stored JSON, filling gaps and migrating older formats:
 * flat bests (before difficulty modes) become Normal / 10 min, and a single
 * record per difficulty (before run lengths) becomes that difficulty's 10 min record.
 */
function normalize(raw: Record<string, unknown>): SaveData {
  const d = defaults();
  const recs = raw.records as Record<string, unknown> | undefined;
  const records = defaults().records;
  for (const diff of DIFFICULTY_IDS) {
    const entry = recs ? (recs[diff] as Record<string, unknown> | undefined) : diff === 'normal' ? raw : undefined;
    if (!entry) continue;
    if (typeof entry.bestTime === 'number') {
      records[diff].long = pickRecord(entry);
    } else {
      for (const len of RUN_LENGTH_IDS) records[diff][len] = pickRecord(entry[len]);
    }
  }
  return {
    records,
    difficulty: isDifficulty(raw.difficulty) ? raw.difficulty : d.difficulty,
    runLength: isRunLength(raw.runLength) ? raw.runLength : d.runLength,
    sound: typeof raw.sound === 'boolean' ? raw.sound : d.sound,
    shake: typeof raw.shake === 'boolean' ? raw.shake : d.shake,
  };
}

/** Tiny localStorage wrapper. Failing storage (private mode, quota) never breaks the game. */
export const Save = {
  load(): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? normalize(JSON.parse(raw) as Record<string, unknown>) : defaults();
    } catch {
      return defaults();
    }
  },

  update(patch: Partial<SaveData>): SaveData {
    const next = { ...Save.load(), ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    return next;
  },

  /** Records a finished run under its difficulty and length; returns whether it set a new high score there. */
  recordRun(
    mode: Difficulty,
    length: RunLength,
    score: number,
    time: number,
    kills: number,
    won: boolean,
  ): { record: ModeRecord; newBest: boolean } {
    const cur = Save.load();
    const prev = cur.records[mode][length];
    const record: ModeRecord = {
      bestScore: Math.max(prev.bestScore, score),
      bestTime: Math.max(prev.bestTime, time),
      bestKills: Math.max(prev.bestKills, kills),
      wins: prev.wins + (won ? 1 : 0),
      runs: prev.runs + 1,
    };
    Save.update({ records: { ...cur.records, [mode]: { ...cur.records[mode], [length]: record } } });
    return { record, newBest: score > prev.bestScore };
  },
};
