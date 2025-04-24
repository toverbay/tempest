import { writable, derived } from 'svelte/store';
import type {
  Item,
  Equipment,
  Inventory,
  PlayerStats,
  Enemy,
  GameMessage
} from '../types/';

interface GameState {
  playerStats: PlayerStats;
  inventory: Inventory;
  equipment: Equipment;
  messages: GameMessage[];
  currentEnemy: Enemy | null;
  isInBattle: boolean;
  isInventoryOpen: boolean;
  isEquipmentOpen: boolean;
  isSkillsOpen: boolean;
  selectedItemIndex: number;
  selectedEquipmentSlot: 'mainHand' | 'offHand' | null;
}

const initialState: GameState = {
  playerStats: {
    health: 100,
    maxHealth: 100,
    level: 1,
    experience: 0,
    strength: 10,
    defense: 5
  },
  inventory: {
    gold: 0,
    items: []
  },
  equipment: {
    mainHand: null,
    offHand: null
  },
  messages: [],
  currentEnemy: null,
  isInBattle: false,
  isInventoryOpen: false,
  isEquipmentOpen: false,
  isSkillsOpen: false,
  selectedItemIndex: 0,
  selectedEquipmentSlot: null
};

function createGameState() {
  const { subscribe, set, update } = writable<GameState>(initialState);

  return {
    subscribe,
    addToInventory: (item: Item) => {
      update(state => {
        const newInventory = { ...state.inventory };
        newInventory.items.push({ item, count: 1 });
        return { ...state, inventory: newInventory };
      });
    },
    removeFromInventory: (itemId: string) => {
      update(state => {
        const newInventory = { ...state.inventory };
        newInventory.items = newInventory.items.filter(item => item.item.id !== itemId);
        return { ...state, inventory: newInventory };
      });
    },
    equipItem: (item: Item, hand: 'mainHand' | 'offHand') => {
      update(state => {
        const newEquipment = { ...state.equipment };
        newEquipment[hand] = item;
        return { ...state, equipment: newEquipment };
      });
    },
    unequipItem: (hand: 'mainHand' | 'offHand') => {
      update(state => {
        const newEquipment = { ...state.equipment };
        newEquipment[hand] = null;
        return { ...state, equipment: newEquipment };
      });
    },
    addMessage: (message: Omit<GameMessage, 'id' | 'timestamp'>) => {
      update(state => {
        // Check if the message is the same as the last one
        const lastMessage = state.messages.length > 0 ? state.messages[state.messages.length - 1] : null;
        const isDuplicate = lastMessage && 
          lastMessage.text === message.text && 
          lastMessage.level === message.level;
        
        // If it's a duplicate, return the state unchanged
        if (isDuplicate) {
          return state;
        }
        
        // Otherwise, add the new message
        const newMessage: GameMessage = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: Date.now()
        };
        return {
          ...state,
          messages: [...state.messages, newMessage].slice(-50) // Keep last 50 messages
        };
      });
    },
    setSelectedItemIndex: (index: number) => {
      update(state => ({ ...state, selectedItemIndex: index }));
    },
    setSelectedEquipmentSlot: (slot: 'mainHand' | 'offHand' | null) => {
      update(state => ({ ...state, selectedEquipmentSlot: slot }));
    },
    toggleInventory: () => {
      update(state => ({ ...state, isInventoryOpen: !state.isInventoryOpen }));
    },
    toggleEquipment: () => {
      update(state => ({ ...state, isEquipmentOpen: !state.isEquipmentOpen }));
    },
    toggleSkills: () => {
      update(state => ({ ...state, isSkillsOpen: !state.isSkillsOpen }));
    },
    reset: () => set(initialState)
  };
}

export const gameState = createGameState();

export const enemyHealthPercent = derived(gameState, $gameState => 
  $gameState.currentEnemy ? ($gameState.currentEnemy.health / $gameState.currentEnemy.maxHealth) * 100 : 0
); 