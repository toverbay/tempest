export * from './common';
export * from './character';
import type { Item, ItemStack } from './character';
export type EquipmentHand = 'mainHand' | 'offHand';
export type Equipment = Record<EquipmentHand, Item | null>;

export interface Inventory {
  gold: number;
  items: ItemStack<Item>[];
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  level: number;
  experience: number;
  strength: number;
  defense: number;
}

export interface Enemy {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  damage: number;
  defense: number;
  sprite: string;
}

export interface GameMessage {
  id: string;
  text: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'combat';
  timestamp: number;
} 