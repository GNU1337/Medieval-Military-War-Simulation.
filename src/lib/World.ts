import { 
  Unit, 
  Resource, 
  Faction, 
  FactionColor, 
  UnitType, 
  StatusEffect, 
  SimulationState, 
  Vector2,
  FlagZone
} from '../types.ts';

const GRID_SIZE = 40;
const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 1000;

export class World {
  state: SimulationState;
  grid: Map<string, Set<string>> = new Map();
  private engagementStarts: Map<string, number> = new Map();
  private finishedEngagementDurations: number[] = [];

  constructor() {
    this.state = this.initializeState();
    this.seedWorld();
  }

  private initializeState(): SimulationState {
    const factions: Record<FactionColor, Faction> = {
      red: { id: 'red', name: 'Crimson Legion', color: '#ff4444', gold: 500, population: 0, upgrades: { plateArmor: false, fastCavalry: false, phalanxCoordination: false }, basePosition: { x: 100, y: 100 } },
      blue: { id: 'blue', name: 'Azure Guard', color: '#4444ff', gold: 500, population: 0, upgrades: { plateArmor: false, fastCavalry: false, phalanxCoordination: false }, basePosition: { x: 900, y: 100 } },
      green: { id: 'green', name: 'Emerald Host', color: '#44ff44', gold: 500, population: 0, upgrades: { plateArmor: false, fastCavalry: false, phalanxCoordination: false }, basePosition: { x: 100, y: 900 } },
      yellow: { id: 'yellow', name: 'Solaris Order', color: '#ffff44', gold: 500, population: 0, upgrades: { plateArmor: false, fastCavalry: false, phalanxCoordination: false }, basePosition: { x: 900, y: 900 } },
    };

    return {
      factions,
      units: [],
      resources: [],
      influenceGrid: {},
      globalSpeedMultiplier: 1.0,
      tick: 0,
      flagZones: this.initializeFlagZones(),
      stats: {
        totalUnitsDestroyed: 0,
        factionStats: {
          red: { goldGathered: 0, unitsSpawned: 0, kills: 0 },
          blue: { goldGathered: 0, unitsSpawned: 0, kills: 0 },
          green: { goldGathered: 0, unitsSpawned: 0, kills: 0 },
          yellow: { goldGathered: 0, unitsSpawned: 0, kills: 0 }
        },
        averageEngagementDuration: 15.0,
        history: [{
          tick: 0,
          redPop: 0,
          bluePop: 0,
          greenPop: 0,
          yellowPop: 0,
          redGold: 500,
          blueGold: 500,
          greenGold: 500,
          yellowGold: 500
        }]
      }
    };
  }

  private initializeFlagZones(): FlagZone[] {
    const zones: FlagZone[] = [];
    const center = { x: 500, y: 500 };
    const dist = 300;
    
    // Five zones: One in center, four around it
    const positions = [
      { x: center.x, y: center.y },
      { x: center.x - dist, y: center.y - dist },
      { x: center.x + dist, y: center.y - dist },
      { x: center.x - dist, y: center.y + dist },
      { x: center.x + dist, y: center.y + dist },
    ];

    positions.forEach((pos, i) => {
      zones.push({
        id: `zone-${i}`,
        position: pos,
        radius: 60,
        owner: null,
        capturingFaction: null,
        captureProgress: 0,
        lastSpawnTick: 0
      });
    });
    return zones;
  }

  private seedWorld() {
    // Initial units
    Object.keys(this.state.factions).forEach(color => {
      const faction = color as FactionColor;
      for (let i = 0; i < 10; i++) {
        this.spawnUnit(faction, UnitType.WARRIOR);
        this.spawnUnit(faction, UnitType.WORKER);
        this.spawnUnit(faction, UnitType.SCOUT);
      }
    });

    // Initial resources
    for (let i = 0; i < 30; i++) {
      this.spawnResource();
    }
  }

  spawnUnit(faction: FactionColor, type: UnitType, customPos?: Vector2) {
    const base = this.state.factions[faction].basePosition;
    const isPlateArmor = this.state.factions[faction].upgrades.plateArmor;
    const maxHP = type === UnitType.WARRIOR ? (isPlateArmor ? 150 : 100) : 50;
    
    const pos = customPos || { 
      x: base.x + (Math.random() - 0.5) * 50, 
      y: base.y + (Math.random() - 0.5) * 50 
    };

    const unit: Unit = {
      id: Math.random().toString(36).substr(2, 9),
      faction,
      type,
      position: { ...pos },
      health: maxHP,
      maxHealth: maxHP,
      targetId: null,
      targetType: null,
      status: StatusEffect.NONE,
      statusDuration: 0,
      speed: type === UnitType.SCOUT ? 3 : type === UnitType.WORKER ? 1.5 : 2,
      attackPower: type === UnitType.WARRIOR ? 10 : 2,
      goldCarrying: 0,
      lastAttackTime: 0,
    };
    this.state.units.push(unit);
    this.state.factions[faction].population++;
    this.state.stats.factionStats[faction].unitsSpawned++;
  }

  spawnResource() {
    const resource: Resource = {
      id: Math.random().toString(36).substr(2, 9),
      faction: 'red', // Dummy faction for generic resources
      position: { x: Math.random() * WORLD_WIDTH, y: Math.random() * WORLD_HEIGHT },
      health: 100,
      maxHealth: 100,
      amount: 100 + Math.random() * 400,
    };
    this.state.resources.push(resource);
  }

  private getGridKey(pos: Vector2): string {
    const gx = Math.floor(pos.x / GRID_SIZE);
    const gy = Math.floor(pos.y / GRID_SIZE);
    return `${gx},${gy}`;
  }

  update() {
    this.state.tick++;
    this.updateSpatialGrid();
    this.updateInfluenceGrid();

    // Record engagement starts
    this.state.units.forEach(u => {
      if (u.targetId && u.targetType === 'UNIT') {
        if (!this.engagementStarts.has(u.id)) {
          this.engagementStarts.set(u.id, this.state.tick);
        }
      }
    });

    this.state.units.forEach(unit => this.updateUnit(unit));

    // Handle Flag Zone Capture and Reinforcements
    if (this.state.flagZones) {
      this.state.flagZones.forEach(zone => {
      const unitsInZone = this.state.units.filter(u => 
        u.health > 0 && this.dist(u.position, zone.position) < zone.radius
      );

      const factionMight: Record<string, number> = {};
      unitsInZone.forEach(u => {
        // Military might: Warriors = 3, Scouts = 1, Workers = 0.5
        const might = u.type === UnitType.WARRIOR ? 3 : u.type === UnitType.SCOUT ? 1 : 0.5;
        factionMight[u.faction] = (factionMight[u.faction] || 0) + might;
      });

      const activeFactions = Object.keys(factionMight);
      
      if (activeFactions.length === 0) {
        // Decay progress if no one is there
        if (zone.captureProgress > 0 && !zone.owner) {
          zone.captureProgress = Math.max(0, zone.captureProgress - 0.5);
        }
      } else {
        // Get faction with most might
        const dominantFaction = activeFactions.reduce((a, b) => factionMight[a] > factionMight[b] ? a : b) as FactionColor;
        
        if (dominantFaction !== zone.owner) {
          zone.capturingFaction = dominantFaction;
          // Capture progress: 5 seconds = 300 ticks (at 60fps). 
          // 100 / 300 = 0.33 per tick
          zone.captureProgress += 0.35 * (this.state.globalSpeedMultiplier || 1);
          
          if (zone.captureProgress >= 100) {
            zone.owner = dominantFaction;
            zone.captureProgress = 0;
            zone.capturingFaction = null;
            zone.lastSpawnTick = this.state.tick;
          }
        } else {
          // Owner is present, reset capture progress of others
          zone.captureProgress = 0;
          zone.capturingFaction = null;
        }
      }

      // Reinforcements: Squad of 3 every 10 seconds (600 ticks)
      if (zone.owner && this.state.tick - zone.lastSpawnTick >= 600) {
        for (let i = 0; i < 3; i++) {
          const offset = { x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 20 };
          this.spawnUnit(zone.owner, UnitType.WARRIOR, { 
            x: zone.position.x + offset.x, 
            y: zone.position.y + offset.y 
          });
        }
        zone.lastSpawnTick = this.state.tick;
      }
    });
  }
    
    // Cleanup and statistics
    const deadUnits = this.state.units.filter(u => u.health <= 0);
    deadUnits.forEach(u => {
      this.state.stats.totalUnitsDestroyed++;
      const killer = this.state.units.find(k => k.targetId === u.id && k.faction !== u.faction);
      if (killer) {
        this.state.stats.factionStats[killer.faction].kills++;
      }
      
      if (this.engagementStarts.has(u.id)) {
        const duration = this.state.tick - this.engagementStarts.get(u.id)!;
        this.finishedEngagementDurations.push(duration);
        this.engagementStarts.delete(u.id);
      }
      
      this.state.units.forEach(attacker => {
        if (attacker.targetId === u.id && this.engagementStarts.has(attacker.id)) {
          const duration = this.state.tick - this.engagementStarts.get(attacker.id)!;
          this.finishedEngagementDurations.push(duration);
          this.engagementStarts.delete(attacker.id);
        }
      });
    });

    if (this.finishedEngagementDurations.length > 0) {
      if (this.finishedEngagementDurations.length > 100) {
        this.finishedEngagementDurations = this.finishedEngagementDurations.slice(-100);
      }
      const sum = this.finishedEngagementDurations.reduce((a, b) => a + b, 0);
      this.state.stats.averageEngagementDuration = parseFloat((sum / this.finishedEngagementDurations.length).toFixed(1));
    }

    this.state.units = this.state.units.filter(u => u.health > 0);
    this.state.resources = this.state.resources.filter(r => r.amount > 0);

    // Update Faction Pop counts
    Object.keys(this.state.factions).forEach(color => {
      this.state.factions[color as FactionColor].population = this.state.units.filter(u => u.faction === color).length;
    });

    // Record history snapshot
    if (this.state.tick % 100 === 0) {
      this.state.stats.history.push({
        tick: this.state.tick,
        redPop: this.state.units.filter(u => u.faction === 'red').length,
        bluePop: this.state.units.filter(u => u.faction === 'blue').length,
        greenPop: this.state.units.filter(u => u.faction === 'green').length,
        yellowPop: this.state.units.filter(u => u.faction === 'yellow').length,
        redGold: Math.floor(this.state.factions.red.gold),
        blueGold: Math.floor(this.state.factions.blue.gold),
        greenGold: Math.floor(this.state.factions.green.gold),
        yellowGold: Math.floor(this.state.factions.yellow.gold),
      });
      if (this.state.stats.history.length > 40) {
        this.state.stats.history.shift();
      }
    }

    // Auto-purchase upgrades occasionally for factions with gold surplus
    if (this.state.tick % 60 === 0) {
      Object.keys(this.state.factions).forEach(fId => {
        const faction = this.state.factions[fId as FactionColor];
        if (faction.gold >= 250) {
          if (!faction.upgrades.plateArmor) {
            this.buyUpgrade(fId as FactionColor, 'plateArmor');
          } else if (!faction.upgrades.fastCavalry) {
            this.buyUpgrade(fId as FactionColor, 'fastCavalry');
          } else if (!faction.upgrades.phalanxCoordination) {
            this.buyUpgrade(fId as FactionColor, 'phalanxCoordination');
          }
        }
      });
    }

    // Spawn new resources occasionally
    if (this.state.tick % 300 === 0 && this.state.resources.length < 50) {
      this.spawnResource();
    }
  }

  private updateInfluenceGrid() {
    const { influenceGrid, units } = this.state;
    
    // Decay existing influence
    Object.values(influenceGrid).forEach(cell => {
      Object.keys(cell.factions).forEach(f => {
        const color = f as FactionColor;
        cell.factions[color] *= 0.98;
        if (cell.factions[color] < 0.01) cell.factions[color] = 0;
      });
    });

    // Add influence from units
    units.forEach(unit => {
      const key = this.getGridKey(unit.position);
      if (!influenceGrid[key]) {
        influenceGrid[key] = {
          factions: { red: 0, blue: 0, green: 0, yellow: 0 }
        };
      }
      influenceGrid[key].factions[unit.faction] = Math.min(1.0, influenceGrid[key].factions[unit.faction] + (unit.type === UnitType.SCOUT ? 0.15 : 0.05));
    });
  }

  private updateSpatialGrid() {
    this.grid.clear();
    this.state.units.forEach(u => {
      const key = this.getGridKey(u.position);
      if (!this.grid.has(key)) this.grid.set(key, new Set());
      this.grid.get(key)!.add(u.id);
    });
  }

  private updateUnit(unit: Unit) {
    // Status effects
    if (unit.status !== StatusEffect.NONE) {
      unit.statusDuration--;
      if (unit.statusDuration <= 0) unit.status = StatusEffect.NONE;
      if (unit.status === StatusEffect.GREEK_FIRE) unit.health -= 0.1;
      if (unit.status === StatusEffect.STUNNED) return;
    }

    const { factions, globalSpeedMultiplier } = this.state;
    let baseSpeed = unit.speed;
    if (unit.type === UnitType.SCOUT && factions[unit.faction].upgrades.fastCavalry) {
      baseSpeed = 4.5;
    }
    const speed = baseSpeed * globalSpeedMultiplier;

    if (unit.type === UnitType.WORKER) {
      this.handleWorkerLogic(unit, speed);
    } else if (unit.type === UnitType.SCOUT) {
      this.handleScoutLogic(unit, speed);
    } else {
      this.handleCombatLogic(unit, speed);
    }
  }

  private handleScoutLogic(unit: Unit, speed: number) {
    // Scouts prioritize fast movement and avoiding combat, but head to flags
    const enemy = this.findNearestEnemy(unit);
    if (enemy && this.dist(unit.position, enemy.position) < 50) {
      const dx = unit.position.x - enemy.position.x;
      const dy = unit.position.y - enemy.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      unit.position.x += (dx / dist) * speed * 1.5;
      unit.position.y += (dy / dist) * speed * 1.5;
      return;
    }

    const priorityZones = (this.state.flagZones || []).filter(z => z.owner !== unit.faction);
    if (priorityZones.length > 0) {
      const nearestZone = priorityZones.reduce((prev, curr) => 
        this.dist(unit.position, prev.position) < this.dist(unit.position, curr.position) ? prev : curr
      );
      this.moveTowards(unit, nearestZone.position, speed);
    } else {
      this.wander(unit, speed);
    }
  }

  private handleWorkerLogic(unit: Unit, speed: number) {
    const base = this.state.factions[unit.faction].basePosition;
    if (unit.goldCarrying >= 20) {
      // Return to base
      this.moveTowards(unit, base, speed);
      if (this.dist(unit.position, base) < 10) {
        this.state.factions[unit.faction].gold += unit.goldCarrying;
        this.state.stats.factionStats[unit.faction].goldGathered += unit.goldCarrying;
        unit.goldCarrying = 0;
      }
    } else {
      // Find gold
      let target: Resource | null = null;
      if (unit.targetId) {
        target = this.state.resources.find(r => r.id === unit.targetId) || null;
      }
      
      if (!target || target.amount <= 0) {
        target = this.findNearestResource(unit.position);
        unit.targetId = target?.id || null;
      }

      if (target) {
        this.moveTowards(unit, target.position, speed);
        if (this.dist(unit.position, target.position) < 5) {
          const amount = Math.min(1, target.amount);
          target.amount -= amount;
          unit.goldCarrying += amount;
        }
      }
    }
  }

  private handleCombatLogic(unit: Unit, speed: number) {
    let target = this.state.units.find(u => u.id === unit.targetId && u.faction !== unit.faction && u.health > 0);
    
    if (!target) {
      target = this.findNearestEnemy(unit);
      unit.targetId = target?.id || null;
    }

    if (target && this.dist(unit.position, target.position) < 250) {
      this.moveTowards(unit, target.position, speed);
      if (this.dist(unit.position, target.position) < 15) {
        // Melee combat
        const now = Date.now();
        if (now - unit.lastAttackTime > 1000) {
          let attackPower = unit.attackPower;
          const faction = this.state.factions[unit.faction];
          if (unit.type === UnitType.WARRIOR && faction.upgrades.phalanxCoordination) {
            const allies = this.countNearbyFriendlyWarriors(unit);
            if (allies > 0) {
              // Increase attack power by +20% per nearby warrior up to +60% max
              attackPower = Math.floor(unit.attackPower * (1.0 + Math.min(0.6, allies * 0.2)));
            }
          }
          
          target.health -= attackPower;
          unit.lastAttackTime = now;
          
          // Chance for status effect
          if (Math.random() < 0.1) {
             target.status = Math.random() < 0.5 ? StatusEffect.GREEK_FIRE : StatusEffect.STUNNED;
             target.statusDuration = 100;
          }
        }
      }
    } else {
      // Seek flag zones if no enemies nearby
      const priorityZones = (this.state.flagZones || []).filter(z => z.owner !== unit.faction);
      if (priorityZones.length > 0) {
        const nearestZone = priorityZones.reduce((prev, curr) => 
          this.dist(unit.position, prev.position) < this.dist(unit.position, curr.position) ? prev : curr
        );
        this.moveTowards(unit, nearestZone.position, speed);
      } else {
        this.wander(unit, speed);
      }
    }
  }

  private moveTowards(unit: Unit, target: Vector2, speed: number) {
    const dx = target.x - unit.position.x;
    const dy = target.y - unit.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      unit.position.x += (dx / dist) * speed;
      unit.position.y += (dy / dist) * speed;
    }
    
    // Collision avoidance
    this.avoidCollisions(unit);
  }

  private avoidCollisions(unit: Unit) {
    const key = this.getGridKey(unit.position);
    const neighbors = this.grid.get(key);
    if (neighbors) {
      neighbors.forEach(id => {
        if (id === unit.id) return;
        const other = this.state.units.find(u => u.id === id);
        if (!other) return;
        const d = this.dist(unit.position, other.position);
        if (d < 10) {
          const dx = unit.position.x - other.position.x;
          const dy = unit.position.y - other.position.y;
          unit.position.x += dx * 0.1;
          unit.position.y += dy * 0.1;
        }
      });
    }

    // World bounds
    unit.position.x = Math.max(0, Math.min(WORLD_WIDTH, unit.position.x));
    unit.position.y = Math.max(0, Math.min(WORLD_HEIGHT, unit.position.y));
  }

  private wander(unit: Unit, speed: number) {
    unit.position.x += (Math.random() - 0.5) * speed;
    unit.position.y += (Math.random() - 0.5) * speed;
  }

  private dist(a: Vector2, b: Vector2): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  private findNearestEnemy(unit: Unit): Unit | null {
    let nearest: Unit | null = null;
    let minDist = Infinity;
    
    // Check nearby grid cells
    const gx = Math.floor(unit.position.x / GRID_SIZE);
    const gy = Math.floor(unit.position.y / GRID_SIZE);

    for (let x = gx - 1; x <= gx + 1; x++) {
      for (let y = gy - 1; y <= gy + 1; y++) {
        const cell = this.grid.get(`${x},${y}`);
        if (cell) {
          cell.forEach(id => {
            const other = this.state.units.find(u => u.id === id);
            if (other && other.faction !== unit.faction && other.health > 0) {
              const d = this.dist(unit.position, other.position);
              if (d < minDist) {
                minDist = d;
                nearest = other;
              }
            }
          });
        }
      }
    }
    return nearest;
  }

  private findNearestResource(pos: Vector2): Resource | null {
    let nearest: Resource | null = null;
    let minDist = Infinity;
    this.state.resources.forEach(r => {
      const d = this.dist(pos, r.position);
      if (d < minDist) {
        minDist = d;
        nearest = r;
      }
    });
    return nearest;
  }

  buyUpgrade(factionId: FactionColor, upgradeKey: 'plateArmor' | 'fastCavalry' | 'phalanxCoordination'): boolean {
    const faction = this.state.factions[factionId];
    if (faction.upgrades[upgradeKey]) return false; // Already upgraded
    
    const cost = 200;
    if (faction.gold >= cost) {
      faction.gold -= cost;
      faction.upgrades[upgradeKey] = true;
      
      // Immediate action for plate armor
      if (upgradeKey === 'plateArmor') {
        this.state.units.forEach(u => {
          if (u.faction === factionId && u.type === UnitType.WARRIOR) {
            u.maxHealth = 150;
            u.health = Math.min(150, u.health + 50);
          }
        });
      }
      return true;
    }
    return false;
  }

  private countNearbyFriendlyWarriors(unit: Unit): number {
    let count = 0;
    const gx = Math.floor(unit.position.x / GRID_SIZE);
    const gy = Math.floor(unit.position.y / GRID_SIZE);
    const searchRadius = 40; // Max distance for phalanx effect
 
    for (let x = gx - 1; x <= gx + 1; x++) {
      for (let y = gy - 1; y <= gy + 1; y++) {
        const cell = this.grid.get(`${x},${y}`);
        if (cell) {
          cell.forEach(id => {
            if (id === unit.id) return;
            const other = this.state.units.find(u => u.id === id);
            if (other && other.faction === unit.faction && other.type === UnitType.WARRIOR && other.health > 0) {
              if (this.dist(unit.position, other.position) < searchRadius) {
                count++;
              }
            }
          });
        }
      }
    }
    return count;
  }
}
