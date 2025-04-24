import type { EquipmentHand } from './';
import type {
  Attackable,
  Renderable,
  NamedEntity
} from './common';

export interface MapRenderable extends Renderable {
  position: {
    x: number;
    y: number;
  };
  isVisible: boolean;
}

export interface CombatantStats {
  strength: number;
  defense: number;
  mp: number;
  maxMp: number;
}

export interface Combatant extends Renderable, NamedEntity, Attackable {
  stats: CombatantStats;
  isAlive: boolean;
}

export interface CharacterStats extends CombatantStats {
  magic: number;
  speed: number;
}

export interface Character extends Combatant, MapRenderable, NamedEntity {
  level: number;
  stats: CharacterStats;
  position: {
    x: number;
    y: number;
  };
  isPlayer: boolean;
  health: number;
  maxHealth: number;
  loot?: {
    gold: { min: number; max: number };
    items: { id: string; chance: number }[];
  };
}

export interface Consumable {
  id: string;
  name: string;
  description: string;
  effect: {
    type: 'heal' | 'buff' | 'damage';
    value: number;
  };
  useOn: 'self' | 'ally' | 'enemy';
}

export interface Resource {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic';
  category: 'material' | 'crafting' | 'quest';
}

export interface Item extends NamedEntity {
  description: string;
  type: 'consumable' | 'weapon' | 'armor' | 'accessory' | 'quest';
  preferredHand?: EquipmentHand;
  sprite?: string;
  stats?: {
    hp?: number;
    mp?: number;
    strength?: number;
    defense?: number;
    magic?: number;
    speed?: number;
  };
  effect?: string;
  effects?: {
    type: string;
    value: number;
    duration?: number;
  }[];
}

export interface ItemStack<T extends Item> {
  item: T;
  count: number;
}

export interface Inventory {
  gold: number;
  items: ItemStack<Item>[];
}

export interface PlayerCharacter extends Character {
  inventory: Inventory;
  equipment: {
    weapon: Item | null;
    armor: Item | null;
    accessory: Item | null;
  };
} 