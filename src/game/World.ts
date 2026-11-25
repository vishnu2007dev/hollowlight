import type Phaser from 'phaser';
import type { SpatialHash } from '../core/spatialHash';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { Projectile } from '../entities/Projectile';
import type { Effects } from '../systems/Effects';
import type { RunState } from './RunState';

export interface FireOptions {
  texture: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  hostile: boolean;
  pierce?: number;
  radius?: number;
  life?: number;
}

/**
 * The slice of the Game scene that systems are allowed to touch.
 * Keeps WeaponSystem / EnemySystem decoupled from the scene class itself.
 */
export interface World {
  readonly cameras: Phaser.Cameras.Scene2D.CameraManager;
  readonly player: Player;
  readonly run: RunState;
  /** enemies indexed by position, rebuilt every frame */
  readonly hash: SpatialHash<Enemy>;
  readonly effects: Effects;
  /** run time in ms */
  readonly now: number;
  damageEnemy(e: Enemy, amount: number, srcX: number, srcY: number, knock: number): void;
  fire(opts: FireOptions): Projectile;
  hurtPlayer(amount: number): void;
}

/** Largest enemy radius, used to pad spatial queries. */
export const MAX_ENEMY_RADIUS = 42;
