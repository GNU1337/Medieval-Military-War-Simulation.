/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FactionColor = 'red' | 'blue' | 'green' | 'yellow';

export enum UnitType {
  WARRIOR = 'WARRIOR',
  WORKER = 'WORKER',
  SCOUT = 'SCOUT',
}

export enum StatusEffect {
  NONE = 'NONE',
  GREEK_FIRE = 'GREEK_FIRE',
  ACID = 'ACID',
  STUNNED = 'STUNNED',
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Faction {
  id: FactionColor;
  name: string;
  color: string;
  gold: number;
  population: number;
  upgrades: {
    plateArmor: boolean;
    fastCavalry: boolean;
    phalanxCoordination: boolean;
  };
  basePosition: Vector2;
}

export interface SimulationEntity {
  id: string;
  faction: FactionColor;
  position: Vector2;
  health: number;
  maxHealth: number;
}

export interface Unit extends SimulationEntity {
  type: UnitType;
  targetId: string | null;
  targetType: 'UNIT' | 'RESOURCE' | 'BASE' | null;
  status: StatusEffect;
  statusDuration: number;
  speed: number;
  attackPower: number;
  goldCarrying: number;
  lastAttackTime: number;
}

export interface Resource extends SimulationEntity {
  amount: number;
}

export interface InfluenceCell {
  factions: Record<FactionColor, number>;
}

export interface FactionStats {
  goldGathered: number;
  unitsSpawned: number;
  kills: number;
}

export interface SimulationStats {
  totalUnitsDestroyed: number;
  factionStats: Record<FactionColor, FactionStats>;
  averageEngagementDuration: number;
  history: {
    tick: number;
    redPop: number;
    bluePop: number;
    greenPop: number;
    yellowPop: number;
    redGold: number;
    blueGold: number;
    greenGold: number;
    yellowGold: number;
  }[];
}

export interface FlagZone {
  id: string;
  position: Vector2;
  radius: number;
  owner: FactionColor | null;
  capturingFaction: FactionColor | null;
  captureProgress: number; // 0 to 100
  lastSpawnTick: number;
}

export interface SimulationState {
  factions: Record<FactionColor, Faction>;
  units: Unit[];
  resources: Resource[];
  flagZones: FlagZone[];
  influenceGrid: Record<string, InfluenceCell>;
  globalSpeedMultiplier: number;
  tick: number;
  stats: SimulationStats;
}

export interface WarBriefing {
  analysis: string;
  resourceDistribution: string;
  tacticalAdvice: string;
  timestamp: string;
}
