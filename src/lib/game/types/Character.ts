export interface Character {
  id: string;
  name: string;
  level: number;
  stats: {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    strength: number;
    defense: number;
    magic: number;
    speed: number;
  };
  position: {
    x: number;
    y: number;
  };
  sprite: string;
  isPlayer: boolean;
  health: number;
  maxHealth: number;
}

export interface PlayerCharacter extends Character {
  inventory: Item[];
  equipment: {
    weapon: Item | null;
    armor: Item | null;
    accessory: Item | null;
  };
}

export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable';
  description: string;
  stats?: {
    [key: string]: number;
  };
  effect?: {
    type: 'heal' | 'buff' | 'damage';
    value: number;
  };
} 