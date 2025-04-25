<script lang="ts">
  import type { Character, GameMessage, PlayerCharacter, Item, ItemStack } from './types/';
  import { onMount } from 'svelte';
  import EquipmentUI from './components/EquipmentUI.svelte';
  import GameInfo from './components/GameInfo.svelte';
  import { gameState } from './stores/gameState';
  import MessageLog from './components/MessageLog.svelte'
  import Battle from './components/Battle.svelte'
  
  export let player: PlayerCharacter;
  export let mapData: {
    width: number;
    height: number;
    tiles: number[][];
  } = {
    width: 20,
    height: 15,
    tiles: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]
  };
  
  // Initialize player health if not already set
  if (player.health === undefined) {
    player.health = 100;
    player.maxHealth = 100;
  }
  
  // Initialize player inventory
  player.inventory = {
    gold: 0,
    items: [
      {
        count: 3,
        item: {
          id: 'health_potion',
          name: 'Health Potion',
          description: 'Restores 30 HP',
          type: 'consumable',
          sprite: '🧪'
        }
      },
      {
        count: 1,
        item: {
          id: 'strength_potion',
          name: 'Strength Potion',
          description: 'Increases attack damage by 50% for 3 turns',
          type: 'consumable',
          sprite: '💪'
        }
      }
    ]
  };
  
  // Items on the floor
  let floorItems: { id: string, position: { x: number, y: number }, sprite: string }[] = [];
  
  // Equipment slots
  let equipment = {
    mainHand: null as string | null,
    offHand: null as string | null
  };
  
  // Item effects
  let activeEffects = {
    strength: { active: false, turnsRemaining: 0 }
  };
  
  // Resource counts
  let resources = {
    wood: 0
  };
  
  // Tree health tracking
  let treeHealth: { [key: string]: number } = {};
  
  const TILE_SIZE = 32;
  let isMoving = false;
  let targetPosition = { x: player.position.x, y: player.position.y };
  let keysPressed = new Set<string>();
  let lastMoveTime = 0;
  const MOVE_DELAY = 0; // No delay between moves
  
  // Game tick system
  let gameTick = 0;
  let isInBattle = false;
  let showInventory = false;
  let isPlayerDefeated = false;
  let monstersHostile = true; // Toggle for monster hostility
  
  // Fog of war system
  let visibleTiles: boolean[][] = [];
  let discoveredTiles: boolean[][] = [];
  const VISIBILITY_RADIUS = 3; // Number of tiles visible in each direction
  let fogOfWarEnabled = false; // Disabled by default since no torch is equipped
  let rememberDiscoveredTiles = true; // Set to false to hide previously discovered tiles
  let visibilityUpdateCounter = 0; // Counter to force reactivity
  let tileElements: HTMLElement[][] = []; // Store references to tile elements
  let fogOfWarInitialized = false; // Flag to track if fog of war has been initialized
  
  // Inventory navigation
  let selectedItemIndex = 0;
  
  // Equipment navigation
  let showEquipment = false;
  let selectedHand: 'mainHand' | 'offHand' | null = 'mainHand';
  
  // Create an enemy with loot
  type EnemyWithLoot = Character & { 
    loot: { 
      gold: { min: number; max: number }; 
      items: { id: string; chance: number }[] 
    } 
  };

  function createEnemy(): EnemyWithLoot {
    return {
      id: 'slime',
      name: "Slime",
      level: 1,
      health: 100,
      maxHealth: 100,
      stats: {
        strength: 5,
        defense: 3,
        magic: 0,
        speed: 3,
        mp: 0,
        maxMp: 0
      },
      position: { x: 0, y: 0 },
      isAlive: true,
      sprite: "🟣",
      isVisible: true,
      isPlayer: false,
      loot: {
        gold: { min: 5, max: 15 },
        items: [
          { id: 'health_potion', chance: 0.3 },
          { id: 'strength_potion', chance: 0.1 }
        ]
      }
    };
  }

  // Initialize enemy with loot
  let enemy = createEnemy();
  
  // Emoji mappings for tiles
  const tileEmojis: { [key: number]: string } = {
    0: "🟩", // grass (walkable)
    1: "🟦", // water (walkable)
    2: "🧱", // wall (impassable)
    3: "🟫", // dirt path (walkable)
    4: "🟨", // sand/desert (walkable)
    5: "⬜", // snow (walkable)
    6: "🟤", // mud (walkable but slower)
    7: "🟡", // flowers/meadow (walkable)
    8: "🌳", // tree (impassable)
    9: "🪨", // rock (impassable)
    10: "🌵", // cactus (impassable)
    11: "🏠", // house/building (impassable)
    12: "⛰️", // mountain (impassable)
    13: "⚡", // power-up tile (walkable, gives temporary boost)
    14: "💎", // treasure tile (walkable, gives gold)
    15: "🚪", // door/portal (walkable, teleports)
    16: "🕳️", // pit/trap (walkable, damages player)
    17: "🔮", // magic tile (walkable, random effect)
    18: "🔥", // fire (walkable, damages player)
    19: "💨", // wind (walkable, pushes player)
    20: "🌊", // current (walkable, moves player in water)
    21: "🔑", // key (collectible)
    22: "🔒", // locked door (requires key)
    23: "⚒️", // tool (collectible)
    24: "📜"  // scroll (collectible)
  };
  
  // Function to check if a torch is equipped
  function hasTorchEquipped(): boolean {
    return equipment.mainHand === 'torch' || equipment.offHand === 'torch';
  }
  
  // Function to update fog of war based on torch equipment
  function updateFogOfWarBasedOnTorch() {
    const shouldBeEnabled = hasTorchEquipped();
    if (fogOfWarEnabled !== shouldBeEnabled) {
      fogOfWarEnabled = shouldBeEnabled;
      if (fogOfWarEnabled) {
        gameState.addMessage({ text: "Your torch lights up the area around you.", level: 'info' });
        updateVisibility();
      } else {
        gameState.addMessage({ text: "Without a torch, you can't see anything in the darkness.", level: 'info' });
        updateTileVisibility(); // Update all tiles to be dark
        // Make enemy dark when fog of war is disabled
        if (enemy.isAlive) {
          enemy.isVisible = false;
        }
      }
    }
  }
  
  // Handle key down events
  function handleKeyDown(event: KeyboardEvent) {
    // Prevent default behavior for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D', 'i', 'I', 'Enter', 'Escape', 'Tab', 'e', 'E', 'p', 'P', 'h', 'H', 'c', 'C'].includes(event.key)) {
      event.preventDefault();
    }
    
    // Toggle monster hostility with H key
    if (event.key === 'h' || event.key === 'H') {
      monstersHostile = !monstersHostile;
      gameState.addMessage({ text: monstersHostile ? "Monsters are now hostile!" : "Monsters are now passive!", level: 'info' });
      return;
    }
    
    // Chop trees with C key - now just mark that C was pressed
    if (event.key === 'c' || event.key === 'C') {
      keysPressed.add('C');
      return;
    }
    
    // Pickup items with P key
    if (event.key === 'p' || event.key === 'P') {
      pickupNearbyItems();
      return;
    }
    
    // Equipment menu with E key
    if (event.key === 'e' || event.key === 'E') {
      showEquipment = !showEquipment;
      // Reset selection when opening equipment
      if (showEquipment) {
        selectedHand = 'mainHand';
      }
      return;
    }
    
    // Movement keys - only process if not in battle and not defeated
    if (!isInBattle && !isPlayerDefeated && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      keysPressed.add(event.key);
    }
    
    // Inventory toggle
    if (event.key === 'Tab') {
      showInventory = !showInventory;
      // Reset selection when opening inventory
      if (showInventory) {
        selectedItemIndex = 0;
      }
    }
    
    // Inventory navigation
    if (showInventory) {
      switch(event.key) {
        case 'ArrowUp':
          // Navigate up in inventory
          if (selectedItemIndex > 0) {
            selectedItemIndex--;
          }
          break;
        case 'ArrowDown':
          // Navigate down in inventory
          if (selectedItemIndex < player.inventory.items.length - 1) {
            selectedItemIndex++;
          }
          break;
        case 'Enter':
          // Use selected item
          if (player.inventory.items.length > 0) {
            const selectedItem = player.inventory.items[selectedItemIndex];
            useItem(selectedItem.item.id);
          }
          break;
        case 'Escape':
          // Close inventory
          showInventory = false;
          break;
      }
      return; // Don't process other keys when inventory is open
    }
    
    // Equipment navigation
    if (showEquipment) {
      handleEquipmentNavigation(event);
      return; // Don't process other keys when equipment is open
    }
    
    // Battle action keys
    if (isInBattle) {
      switch(event.key) {
        case 'a':
        case 'A':
          handleBattleAction('attack');
          break;
        case 'd':
        case 'D':
          handleBattleAction('defend');
          break;
        case 'i':
        case 'I':
          handleBattleAction('item');
          break;
        case 'Escape':
          // Option to flee from battle
          if (Math.random() > 0.5) { // 50% chance to flee
            gameState.addMessage({ text: "You successfully fled from battle!", level: 'info' });
            endBattle();
          } else {
            gameState.addMessage({ text: "Failed to flee! The enemy attacks!", level: 'info' });
            const enemyDamage = Math.floor(Math.random() * 15) + 5;
            player.health -= enemyDamage;
            gameState.addMessage({ text: `${enemy.name} attacks for ${enemyDamage} damage!`, level: 'info' });
            
            if (player.health <= 0) {
              player.health = 0;
              gameState.addMessage({ text: "Player has been defeated!", level: 'info' });
              endBattle();
            }
            advanceGameTick();
          }
          break;
      }
    }
  }
  
  function handleKeyUp(event: KeyboardEvent) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      keysPressed.delete(event.key);
    }
    
    // Handle tree chopping when C key is released
    if (event.key === 'c' || event.key === 'C') {
      // Check if C was pressed before removing it
      const wasPressed = keysPressed.has('C');
      keysPressed.delete('C');
      
      // Chop trees if C was pressed
      if (wasPressed) {
        chopNearbyTrees();
      }
    }
  }
  
  // Check for movement in the game loop
  function checkMovement(currentTime: number) {
    if (isMoving || showInventory || isInBattle || isPlayerDefeated) {
      requestAnimationFrame(checkMovement);
      return;
    }
    
    // Determine which direction to move based on pressed keys
    let direction: 'up' | 'down' | 'left' | 'right' | null = null;
    if (keysPressed.has('ArrowUp')) direction = 'up';
    else if (keysPressed.has('ArrowDown')) direction = 'down';
    else if (keysPressed.has('ArrowLeft')) direction = 'left';
    else if (keysPressed.has('ArrowRight')) direction = 'right';
    
    if (direction) {
      const moved = moveInDirection(direction);
      // Only advance game tick if the player actually moved
      if (moved) {
        advanceGameTick();
        // Check for nearby items after movement
        checkForNearbyItems();
      }
    }
    
    requestAnimationFrame(checkMovement);
  }
  
  function moveInDirection(direction: 'up' | 'down' | 'left' | 'right'): boolean {
    // Calculate the current tile position
    const currentTileX = Math.floor(player.position.x / TILE_SIZE);
    const currentTileY = Math.floor(player.position.y / TILE_SIZE);
    
    // Calculate the new tile position
    let newTileX = currentTileX;
    let newTileY = currentTileY;
    
    switch(direction) {
      case 'up':
        newTileY = Math.max(0, currentTileY - 1);
        break;
      case 'down':
        newTileY = Math.min(mapData.height - 1, currentTileY + 1);
        break;
      case 'left':
        newTileX = Math.max(0, currentTileX - 1);
        break;
      case 'right':
        newTileX = Math.min(mapData.width - 1, currentTileX + 1);
        break;
    }
    
    // Check if the new tile is walkable
    const newTileType = mapData.tiles[newTileY][newTileX];
    
    // List of impassable tiles
    const impassableTiles = [1, 2, 8, 9, 10, 11, 12, 22]; // water, wall, tree, rock, cactus, house, mountain, locked door
    
    if (impassableTiles.includes(newTileType)) {
      // Special messages for different impassable tiles
      switch(newTileType) {
        case 1: // Water
          gameState.addMessage({ text: "You can't walk on water!", level: 'info' });
          break;
        case 2: // Wall
          gameState.addMessage({ text: "You can't walk through walls!", level: 'info' });
          break;
        case 8: // Tree
          gameState.addMessage({ text: "You can't walk through trees! Press C when next to a tree to chop it.", level: 'info' });
          break;
        case 9: // Rock
          gameState.addMessage({ text: "You can't walk through rocks!", level: 'info' });
          break;
        case 10: // Cactus
          gameState.addMessage({ text: "You can't walk through cacti!", level: 'info' });
          break;
        case 11: // House
          gameState.addMessage({ text: "You can't walk through buildings!", level: 'info' });
          break;
        case 12: // Mountain
          gameState.addMessage({ text: "You can't climb that mountain!", level: 'info' });
          break;
        case 22: // Locked door
          gameState.addMessage({ text: "This door is locked. You need a key!", level: 'info' });
          break;
      }
      return false; // Return false to indicate no movement occurred
    }
    
    // Set target position to the center of the new tile
    targetPosition.x = newTileX * TILE_SIZE + TILE_SIZE / 2;
    targetPosition.y = newTileY * TILE_SIZE + TILE_SIZE / 2;
    
    // Start movement animation
    isMoving = true;
    animateMovement();
    
    // Handle special tile effects after movement
    setTimeout(() => {
      handleSpecialTileEffects(newTileType);
    }, 150); // Wait for movement animation to complete
    
    return true; // Return true to indicate movement occurred
  }
  
  // Handle special tile effects
  function handleSpecialTileEffects(tileType: number) {
    switch(tileType) {
      case 6: // Mud
        gameState.addMessage({ text: "The mud slows you down!", level: 'info' });
        // Could implement slower movement here
        break;
      case 13: // Power-up tile
        gameState.addMessage({ text: "You feel energized! Attack power increased for 3 turns.", level: 'info' });
        activeEffects.strength.active = true;
        activeEffects.strength.turnsRemaining = 3;
        break;
      case 14: // Treasure tile
        const goldAmount = Math.floor(Math.random() * 20) + 10;
        player.inventory.gold += goldAmount;
        gameState.addMessage({ text: `You found ${goldAmount} gold!`, level: 'info' });
        // Remove the treasure after collecting
        const treasureTileX = Math.floor(player.position.x / TILE_SIZE);
        const treasureTileY = Math.floor(player.position.y / TILE_SIZE);
        mapData.tiles[treasureTileY][treasureTileX] = 0; // Change to grass
        break;
      case 15: // Door/portal
        gameState.addMessage({ text: "You step through the door and are teleported!", level: 'info' });
        // Teleport to a random location
        const randomX = Math.floor(Math.random() * (mapData.width - 2)) + 1;
        const randomY = Math.floor(Math.random() * (mapData.height - 2)) + 1;
        player.position.x = randomX * TILE_SIZE + TILE_SIZE / 2;
        player.position.y = randomY * TILE_SIZE + TILE_SIZE / 2;
        targetPosition.x = player.position.x;
        targetPosition.y = player.position.y;
        break;
      case 16: // Pit/trap
        const damage = Math.floor(Math.random() * 15) + 5;
        player.health -= damage;
        gameState.addMessage({ text: `You fall into a pit and take ${damage} damage!`, level: 'info' });
        if (player.health <= 0) {
          player.health = 0;
          isPlayerDefeated = true;
          gameState.addMessage({ text: "You have been defeated!", level: 'info' });
        }
        break;
      case 17: // Magic tile
        const randomEffect = Math.floor(Math.random() * 3);
        switch(randomEffect) {
          case 0:
            const healing = Math.floor(Math.random() * 20) + 10;
            player.health = Math.min(player.health + healing, player.maxHealth);
            gameState.addMessage({ text: `Magic heals you for ${healing} HP!`, level: 'info' });
            break;
          case 1:
            player.inventory.gold += 5;
            gameState.addMessage({ text: "Magic gives you 5 gold!", level: 'info' });
            break;
          case 2:
            gameState.addMessage({ text: "Magic teleports you!", level: 'info' });
            const magicX = Math.floor(Math.random() * (mapData.width - 2)) + 1;
            const magicY = Math.floor(Math.random() * (mapData.height - 2)) + 1;
            player.position.x = magicX * TILE_SIZE + TILE_SIZE / 2;
            player.position.y = magicY * TILE_SIZE + TILE_SIZE / 2;
            targetPosition.x = player.position.x;
            targetPosition.y = player.position.y;
            break;
        }
        break;
      case 18: // Fire
        const fireDamage = Math.floor(Math.random() * 10) + 5;
        player.health -= fireDamage;
        gameState.addMessage({ text: `The fire burns you for ${fireDamage} damage!`, level: 'info' });
        if (player.health <= 0) {
          player.health = 0;
          isPlayerDefeated = true;
          gameState.addMessage({ text: "You have been defeated!", level: 'info' });
        }
        break;
      case 19: // Wind
        gameState.addMessage({ text: "The wind pushes you!", level: 'info' });
        // Determine wind direction (could be random or based on tile position)
        const windDirection = Math.floor(Math.random() * 4);
        let windDx = 0;
        let windDy = 0;
        
        switch(windDirection) {
          case 0: windDy = -1; break; // Up
          case 1: windDy = 1; break;  // Down
          case 2: windDx = -1; break; // Left
          case 3: windDx = 1; break;  // Right
        }
        
        // Calculate new position after wind push
        const windNewX = Math.floor(player.position.x / TILE_SIZE) + windDx;
        const windNewY = Math.floor(player.position.y / TILE_SIZE) + windDy;
        
        // Check if the new position is valid
        if (windNewX >= 0 && windNewX < mapData.width && 
            windNewY >= 0 && windNewY < mapData.height) {
          const windTileType = mapData.tiles[windNewY][windNewX];
          const windImpassableTiles = [1, 2, 8, 9, 10, 11, 12, 22];
          
          if (!windImpassableTiles.includes(windTileType)) {
            player.position.x = windNewX * TILE_SIZE + TILE_SIZE / 2;
            player.position.y = windNewY * TILE_SIZE + TILE_SIZE / 2;
            targetPosition.x = player.position.x;
            targetPosition.y = player.position.y;
          }
        }
        break;
      case 20: // Current
        gameState.addMessage({ text: "The current carries you!", level: 'info' });
        // Determine current direction (could be fixed or random)
        const currentDirection = Math.floor(Math.random() * 4);
        let currentDx = 0;
        let currentDy = 0;
        
        switch(currentDirection) {
          case 0: currentDy = -1; break; // Up
          case 1: currentDy = 1; break;  // Down
          case 2: currentDx = -1; break; // Left
          case 3: currentDx = 1; break;  // Right
        }
        
        // Calculate new position after current
        const currentNewX = Math.floor(player.position.x / TILE_SIZE) + currentDx;
        const currentNewY = Math.floor(player.position.y / TILE_SIZE) + currentDy;
        
        // Check if the new position is valid
        if (currentNewX >= 0 && currentNewX < mapData.width && 
            currentNewY >= 0 && currentNewY < mapData.height) {
          const currentTileType = mapData.tiles[currentNewY][currentNewX];
          const currentImpassableTiles = [2, 8, 9, 10, 11, 12, 22];
          
          if (!currentImpassableTiles.includes(currentTileType)) {
            player.position.x = currentNewX * TILE_SIZE + TILE_SIZE / 2;
            player.position.y = currentNewY * TILE_SIZE + TILE_SIZE / 2;
            targetPosition.x = player.position.x;
            targetPosition.y = player.position.y;
          }
        }
        break;
      case 21: // Key
        gameState.addMessage({ text: "You found a key!", level: 'info' });
        // Add key to inventory
        const existingKey = player.inventory.items.find(i => i.item.id === 'key');
        if (existingKey) {
          existingKey.count++;
        } else {
          const newItemStack: ItemStack<Item> = {
            count: 1,
            item: {
              id: 'key',
              name: 'Key',
              description: 'Opens locked doors',
              sprite: '🔑',
              type: 'consumable',
            }
          };
          player.inventory.items.push(newItemStack);
        }
        // Remove the key from the map
        const keyTileX = Math.floor(player.position.x / TILE_SIZE);
        const keyTileY = Math.floor(player.position.y / TILE_SIZE);
        mapData.tiles[keyTileY][keyTileX] = 0; // Change to grass
        break;
      case 23: // Tool
        gameState.addMessage({ text: "You found a tool!", level: 'info' });
        // Add tool to inventory
        const existingTool = player.inventory.items.find(i => i.item.id === 'tool');
        if (existingTool) {
          existingTool.count++;
        } else {
          const newItemStack: ItemStack<Item> = {
            count: 1,
            item: {
              id: 'tool',
              name: 'Tool',
              description: 'Useful for various tasks',
              sprite: '⚒️',
              type: 'consumable',
            }
          };
          player.inventory.items.push(newItemStack);
        }
        // Remove the tool from the map
        const toolTileX = Math.floor(player.position.x / TILE_SIZE);
        const toolTileY = Math.floor(player.position.y / TILE_SIZE);
        mapData.tiles[toolTileY][toolTileX] = 0; // Change to grass
        break;
      case 24: // Scroll
        gameState.addMessage({ text: "You found a scroll!", level: 'info' });
        // Add scroll to inventory
        const existingScroll = player.inventory.items.find(i => i.item.id === 'scroll');
        if (existingScroll) {
          existingScroll.count++;
        } else {
          const newItemStack: ItemStack<Item> = {
            count: 1,
            item: {
              id: 'scroll',
              name: 'Scroll',
              description: 'Contains ancient knowledge',
              sprite: '📜',
              type: 'consumable',
            }
          };
          player.inventory.items.push(newItemStack);
        }
        // Remove the scroll from the map
        const scrollTileX = Math.floor(player.position.x / TILE_SIZE);
        const scrollTileY = Math.floor(player.position.y / TILE_SIZE);
        mapData.tiles[scrollTileY][scrollTileX] = 0; // Change to grass
        break;
    }
  }
  
  function animateMovement() {
    const startX = player.position.x;
    const startY = player.position.y;
    const endX = targetPosition.x;
    const endY = targetPosition.y;
    
    const duration = 150; // Faster animation duration
    const startTime = performance.now();
    
    function updatePosition(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease in-out function for smoother animation
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      player.position.x = startX + (endX - startX) * easeProgress;
      player.position.y = startY + (endY - startY) * easeProgress;
      
      if (progress < 1) {
        requestAnimationFrame(updatePosition);
      } else {
        // Animation complete
        player.position.x = endX;
        player.position.y = endY;
        isMoving = false;
        
        // Update visibility after movement
        if (fogOfWarEnabled) {
          updateVisibility();
        }
        
        // Check for enemy encounter after movement
        checkForEnemyEncounter();
      }
    }
    
    requestAnimationFrame(updatePosition);
  }
  
  // Check if player is close to enemy and initiate battle
  function checkForEnemyEncounter() {
    if (isInBattle || !enemy.isAlive || !monstersHostile) return;
    
    const playerTileX = Math.floor(player.position.x / TILE_SIZE);
    const playerTileY = Math.floor(player.position.y / TILE_SIZE);
    
    const enemyTileX = Math.floor(enemy.position.x / TILE_SIZE);
    const enemyTileY = Math.floor(enemy.position.y / TILE_SIZE);
    
    // If player is adjacent to enemy (including diagonally)
    if (Math.abs(playerTileX - enemyTileX) <= 1 && Math.abs(playerTileY - enemyTileY) <= 1) {
      // Only start battle if the enemy is visible (or fog of war is disabled)
      if (!fogOfWarEnabled || enemy.isVisible) {
        startBattle();
      }
    }
  }
  
  // Start a battle with the enemy
  function startBattle() {
    isInBattle = true;
    gameState.addMessage({ text: `Battle started with ${enemy.name}!`, level: 'combat' });
    
    // In a real game, this would transition to a battle screen
    // For now, we'll just show a message and handle the battle in the game loop
  }
  
  // Handle battle actions
  function handleBattleAction(action: 'attack' | 'defend' | 'item') {
    if (!isInBattle) return;
    
    switch (action) {
      case 'attack':
        // Player attacks enemy
        let damage = Math.floor(Math.random() * 20) + 10; // 10-30 damage
        
        // Apply strength potion effect if active
        if (activeEffects.strength.active) {
          damage = Math.floor(damage * 1.5);
          gameState.addMessage({ text: "Strength potion effect applied to attack!", level: 'combat' });
        }
        
        enemy.health -= damage;
        gameState.addMessage({ text: `Player attacks ${enemy.name} for ${damage} damage!`, level: 'combat' });
        
        // Check if enemy is defeated
        if (enemy.health <= 0) {
          enemy.health = 0;
          enemy.isAlive = false;
          gameState.addMessage({ text: `${enemy.name} has been defeated!`, level: 'combat' });
          
          // Award loot to player
          awardLoot();
          
          endBattle();
        } else {
          // Enemy counter-attacks
          const enemyDamage = Math.floor(Math.random() * 15) + 5; // 5-20 damage
          player.health -= enemyDamage;
          gameState.addMessage({ text: `${enemy.name} counter-attacks for ${enemyDamage} damage!`, level: 'combat' });
          
          // Check if player is defeated
          if (player.health <= 0) {
            player.health = 0;
            isPlayerDefeated = true;
            gameState.addMessage({ text: "Player has been defeated!", level: 'combat' });
            endBattle();
          }
        }
        break;
        
      case 'defend':
        // Player defends (reduces incoming damage)
        gameState.addMessage({ text: "Player takes a defensive stance!", level: 'combat' });
        // Enemy still attacks but with reduced damage
        const reducedDamage = Math.floor(Math.random() * 10) + 3; // 3-13 damage
        player.health -= reducedDamage;
        gameState.addMessage({ text: `${enemy.name} attacks for ${reducedDamage} damage!`, level: 'combat' });
        
        // Check if player is defeated
        if (player.health <= 0) {
          player.health = 0;
          isPlayerDefeated = true;
          gameState.addMessage({ text: "Player has been defeated!", level: 'combat' });
          endBattle();
        }
        break;
        
      case 'item':
        // Show inventory for item selection
        showInventory = true;
        selectedItemIndex = 0;
        break;
    }
    
    // Advance game tick after battle action
    advanceGameTick();
  }
  
  // Award loot to player when enemy is defeated
  function awardLoot() {
    if (!enemy.loot) return;
    
    // Award gold
    const goldAmount = Math.floor(Math.random() * (enemy.loot.gold.max - enemy.loot.gold.min + 1)) + enemy.loot.gold.min;
    player.inventory.gold += goldAmount;
    gameState.addMessage({ text: `You found ${goldAmount} gold!`, level: 'success' });
    
    // Award items based on chance
    for (const item of enemy.loot.items) {
      if (Math.random() < item.chance) {
        // Find if player already has this item
        const existingItem = player.inventory.items.find(i => i.item.id === item.id);
        
        if (existingItem) {
          // Increment count if player already has this item
          existingItem.count++;
        } else {
          // Add new item to inventory
          const newItem = createItemStack(item.id);
          if (newItem) {
            player.inventory.items.push(newItem);
          }
        }
        
        gameState.addMessage({ text: `You found a ${item.id.replace('_', ' ')}!`, level: 'success' });
      }
    }
  }
  
  // Create an item based on its ID
  function createItemStack(id: string): ItemStack<Item> | null {
    const item = createBasicItem(id);
    return {
      item,
      count: 1,
    };
  }

  // Function to create a basic item
  function createBasicItem(id: string): Item {
    switch (id) {
      case 'health_potion':
        return {
          id,
          name: 'Health Potion',
          description: 'Restores 30 HP',
          type: 'consumable',
          sprite: '🧪',
        };
      case 'strength_potion':
        return {
          id,
          name: 'Strength Potion',
          description: 'Increases attack damage by 50% for 3 turns',
          type: 'consumable',
          sprite: '💪',
        };
      case 'torch':
        return {
          id,
          name: 'Torch',
          description: 'Lights up the area around you',
          type: 'accessory',
          sprite: '🔥',
          preferredHand: 'offHand'
        };
      case 'axe':
        return {
          id,
          name: 'Axe',
          description: 'Used to chop down trees',
          type: 'weapon',
          sprite: '🪓',
          preferredHand: 'mainHand',
        };
      default:
        return {
          id,
          name: id.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: 'A mysterious item',
          type: 'consumable',
          sprite: '❓'
        };
    }
  }
  
  // Use an item from inventory
  function useItem(itemId: string) {
    const itemStack = player.inventory.items.find(i => i.item.id === itemId);
    
    if (!itemStack || itemStack.count <= 0) {
      gameState.addMessage({ text: "You don't have that item!", level: 'warning' });
      return;
    }
    
    // Decrease item count
    itemStack.count--;
    
    // Apply item effect
    switch (itemId) {
      case 'health_potion':
        const healing = 30;
        player.health = Math.min(player.health + healing, player.maxHealth);
        gameState.addMessage({ text: `You used a Health Potion and recovered ${healing} HP!`, level: 'info' });
        // If player was defeated, they are now revived
        if (isPlayerDefeated) {
          isPlayerDefeated = false;
          gameState.addMessage({ text: "You have been revived!", level: 'info' });
        }
        break;
        
      case 'strength_potion':
        activeEffects.strength.active = true;
        activeEffects.strength.turnsRemaining = 3;
        gameState.addMessage({ text: "You used a Strength Potion! Attack damage increased for 3 turns.", level: 'info' });
        break;
        
      case 'torch':
      case 'axe':
        // Get the item's preferred hand
        const itemData = createItemStack(itemId);
        const preferredHand = itemData?.item?.preferredHand || 'mainHand';
        
        // Equip the item in the preferred hand
        equipItem(itemId, preferredHand);
        break;
    }
    
    // Remove item if count is 0
    if (itemStack.count <= 0) {
      player.inventory.items = player.inventory.items.filter(i => i.item.id !== itemId);
      // Adjust selected index if needed
      if (selectedItemIndex >= player.inventory.items.length) {
        selectedItemIndex = Math.max(0, player.inventory.items.length - 1);
      }
    }
    
    // Force Svelte to recognize the change by creating a new array
    player.inventory = {...player.inventory};
    
    // Close inventory if in battle
    if (isInBattle) {
      showInventory = false;
      
      // Enemy still attacks
      const itemEnemyDamage = Math.floor(Math.random() * 15) + 5; // 5-20 damage
      player.health -= itemEnemyDamage;
      gameState.addMessage({ text: `${enemy.name} attacks for ${itemEnemyDamage} damage!`, level: 'combat' });
      
      // Check if player is defeated
      if (player.health <= 0) {
        player.health = 0;
        gameState.addMessage({ text: "Player has been defeated!", level: 'combat' });
        endBattle();
      }
      
      // Advance game tick after using item
      advanceGameTick();
    }
  }
  
  // Equip an item in the specified hand
  function equipItem(itemId: string, hand: 'mainHand' | 'offHand') {
    // First, unequip any item in the target hand
    if (equipment[hand]) {
      const currentItemId = equipment[hand];
      // Add the current item back to inventory
      const existingItem = player.inventory.items.find(i => i.item.id === currentItemId);
      if (existingItem) {
        existingItem.count++;
      } else {
        // Create a new item entry
        const newItem = createItemStack(currentItemId);
        if (newItem) {
          player.inventory.items.push(newItem);
        }
      }
      gameState.addMessage({ text: `You unequipped the ${currentItemId.replace('_', ' ')} from your ${hand === 'mainHand' ? 'main' : 'off'} hand.`, level: 'info' });
    }
    
    // Now equip the new item
    equipment[hand] = itemId;
    gameState.addMessage({ text: `You equipped the ${itemId.replace('_', ' ')} in your ${hand === 'mainHand' ? 'main' : 'off'} hand.`, level: 'info' });
    
    // Update fog of war based on torch equipment
    updateFogOfWarBasedOnTorch();
  }
  
  // End the battle
  function endBattle() {
    isInBattle = false;
    gameState.addMessage({ text: "Battle ended!", level: 'info' });
    
    // If enemy was defeated, spawn a new one after a delay
    if (!enemy.isAlive) {
      setTimeout(() => {
        respawnEnemy();
      }, 5000); // Respawn after 5 seconds
    }
    
    // If player is defeated, show a message about using a health potion to revive
    if (isPlayerDefeated) {
      gameState.addMessage({ text: "You are defeated! Use a Health Potion to revive.", level: 'combat' });
    }
  }
  
  // Respawn enemy
  function respawnEnemy() {
    enemy = createEnemy();
    
    // Position the enemy at a random location
    positionEnemy();
    
    // Update enemy visibility based on its position
    if (fogOfWarEnabled) {
      const enemyTileX = Math.floor(enemy.position.x / TILE_SIZE);
      const enemyTileY = Math.floor(enemy.position.y / TILE_SIZE);
      enemy.isVisible = isTileVisible(enemyTileX, enemyTileY);
    }
    
    gameState.addMessage({ text: "A new enemy has appeared!", level: 'info' });
  }
  
  // Advance the game tick
  function advanceGameTick() {
    gameTick++;
    
    // Update active effects
    if (activeEffects.strength.active) {
      activeEffects.strength.turnsRemaining--;
      if (activeEffects.strength.turnsRemaining <= 0) {
        activeEffects.strength.active = false;
        gameState.addMessage({ text: "Strength potion effect has worn off.", level: 'info' });
      }
    }
    
    // Move enemy randomly every 5 ticks if not in battle
    if (gameTick % 5 === 0 && !isInBattle && enemy.isAlive) {
      moveEnemyRandomly();
    }
  }
  
  // Move enemy randomly
  function moveEnemyRandomly() {
    const directions = ['up', 'down', 'left', 'right'];
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    
    // Calculate the current tile position
    const currentTileX = Math.floor(enemy.position.x / TILE_SIZE);
    const currentTileY = Math.floor(enemy.position.y / TILE_SIZE);
    
    // Calculate the new tile position
    let newTileX = currentTileX;
    let newTileY = currentTileY;
    
    switch(randomDirection) {
      case 'up':
        newTileY = Math.max(0, currentTileY - 1);
        break;
      case 'down':
        newTileY = Math.min(mapData.height - 1, currentTileY + 1);
        break;
      case 'left':
        newTileX = Math.max(0, currentTileX - 1);
        break;
      case 'right':
        newTileX = Math.min(mapData.width - 1, currentTileX + 1);
        break;
    }
    
    // Check if the new tile is walkable (not water or wall)
    const newTileType = mapData.tiles[newTileY][newTileX];
    if (newTileType === 1 || newTileType === 2) { // Water or wall
      return; // Don't move if blocked
    }
    
    // Set enemy position to the center of the new tile
    enemy.position.x = newTileX * TILE_SIZE + TILE_SIZE / 2;
    enemy.position.y = newTileY * TILE_SIZE + TILE_SIZE / 2;
    
    // Update enemy visibility based on the new position
    if (fogOfWarEnabled) {
      enemy.isVisible = isTileVisible(newTileX, newTileY);
    } else {
      enemy.isVisible = true;
    }
    
    // Force a visibility update after enemy moves
    if (fogOfWarEnabled) {
      // Increment counter to force reactivity
      visibilityUpdateCounter++;
    }
  }
  
  // Position the player in the center of the viewport
  function centerPlayerInViewport() {
    // Calculate the center tile coordinates
    const centerTileX = Math.floor(mapData.width / 2);
    const centerTileY = Math.floor(mapData.height / 2);
    
    // Find the nearest walkable tile if center is water
    let playerTileX = centerTileX;
    let playerTileY = centerTileY;
    
    // If center is water, find the nearest walkable tile
    if (mapData.tiles[playerTileY][playerTileX] === 1) {
      // Search in expanding squares for a walkable tile
      let found = false;
      let searchRadius = 1;
      
      while (!found && searchRadius < Math.max(mapData.width, mapData.height)) {
        // Check the perimeter of the current search radius
        for (let y = -searchRadius; y <= searchRadius && !found; y++) {
          for (let x = -searchRadius; x <= searchRadius && !found; x++) {
            // Only check the perimeter
            if (Math.abs(x) === searchRadius || Math.abs(y) === searchRadius) {
              const checkX = centerTileX + x;
              const checkY = centerTileY + y;
              
              // Check if the position is within bounds and walkable
              if (checkX >= 0 && checkX < mapData.width && 
                  checkY >= 0 && checkY < mapData.height && 
                  mapData.tiles[checkY][checkX] === 0) {
                playerTileX = checkX;
                playerTileY = checkY;
                found = true;
              }
            }
          }
        }
        searchRadius++;
      }
    }
    
    // Set player position to the center of the selected tile
    player.position.x = playerTileX * TILE_SIZE + TILE_SIZE / 2;
    player.position.y = playerTileY * TILE_SIZE + TILE_SIZE / 2;
    
    // Update target position to match
    targetPosition.x = player.position.x;
    targetPosition.y = player.position.y;
  }
  
  // Position the enemy at a random location
  function positionEnemy() {
    // Place enemy at a random position, but not too close to the player
    let enemyTileX, enemyTileY;
    const playerTileX = Math.floor(player.position.x / TILE_SIZE);
    const playerTileY = Math.floor(player.position.y / TILE_SIZE);
    
    do {
      enemyTileX = Math.floor(Math.random() * mapData.width);
      enemyTileY = Math.floor(Math.random() * mapData.height);
    } while (
      (Math.abs(enemyTileX - playerTileX) < 5 && 
       Math.abs(enemyTileY - playerTileY) < 5) ||
      mapData.tiles[enemyTileY][enemyTileX] !== 0 // Make sure enemy is on grass
    );
    
    enemy.position.x = enemyTileX * TILE_SIZE + TILE_SIZE / 2;
    enemy.position.y = enemyTileY * TILE_SIZE + TILE_SIZE / 2;
  }
  
  // Initialize fog of war
  function initializeFogOfWar() {
    // Create arrays to track visible and discovered tiles
    visibleTiles = Array(mapData.height).fill(false).map(() => Array(mapData.width).fill(false));
    discoveredTiles = Array(mapData.height).fill(false).map(() => Array(mapData.width).fill(false));
    
    // Update visibility based on player position
    updateVisibility();
    
    // Mark as initialized
    fogOfWarInitialized = true;
  }
  
  // Update which tiles are visible based on player position
  function updateVisibility() {
    if (!fogOfWarEnabled) {
      // If fog of war is disabled, make all tiles dark
      enemy.isVisible = false; // Make enemy dark when fog of war is disabled
      return;
    }
    
    // Calculate player's tile position
    const playerTileX = Math.floor(player.position.x / TILE_SIZE);
    const playerTileY = Math.floor(player.position.y / TILE_SIZE);
    
    // Create a new visible tiles array
    const newVisibleTiles = Array(mapData.height).fill(false).map(() => Array(mapData.width).fill(false));
    
    // Reveal tiles within visibility radius
    for (let y = -VISIBILITY_RADIUS; y <= VISIBILITY_RADIUS; y++) {
      for (let x = -VISIBILITY_RADIUS; x <= VISIBILITY_RADIUS; x++) {
        const tileX = playerTileX + x;
        const tileY = playerTileY + y;
        
        // Check if tile is within map bounds
        if (tileX >= 0 && tileX < mapData.width && tileY >= 0 && tileY < mapData.height) {
          // Calculate squared Euclidean distance for a circular effect
          // (x and y here are offsets from the player's tile)
          const squaredDistance = x * x + y * y;
          
          // If within visibility radius, mark as visible and discovered
          // Compare squared distance to squared radius to avoid sqrt
          if (squaredDistance < (VISIBILITY_RADIUS + 0.5) * (VISIBILITY_RADIUS + 0.5)) {
            newVisibleTiles[tileY][tileX] = true;
            discoveredTiles[tileY][tileX] = true;
          }
        }
      }
    }
    
    // Update the visible tiles array with new reference to trigger Svelte reactivity
    visibleTiles = newVisibleTiles;
    
    // Force Svelte to recognize the change by creating a new array for discovered tiles
    discoveredTiles = discoveredTiles.map(row => [...row]);
    
    // Update enemy visibility
    if (enemy.isAlive) {
      const enemyTileX = Math.floor(enemy.position.x / TILE_SIZE);
      const enemyTileY = Math.floor(enemy.position.y / TILE_SIZE);
      enemy.isVisible = isTileVisible(enemyTileX, enemyTileY);
    }
    
    // Increment counter to force reactivity
    visibilityUpdateCounter++;
    
    // Directly update the DOM elements if we have them
    if (fogOfWarInitialized) {
      updateTileVisibility();
    }
  }
  
  // Update tile visibility directly in the DOM
  function updateTileVisibility() {
    if (!tileElements.length) return;
    
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const tileElement = tileElements[y][x];
        
        if (tileElement) {
          if (!fogOfWarEnabled) {
            // If fog of war is disabled, make all tiles dark
            tileElement.style.opacity = "0.2";
            tileElement.style.filter = "brightness(0.3)";
          } else {
            // If fog of war is enabled, apply visibility based on isTileVisible
            const isVisible = isTileVisible(x, y);
            if (isVisible) {
              tileElement.style.opacity = "1";
              tileElement.style.filter = "none";
            } else {
              tileElement.style.opacity = "0.2";
              tileElement.style.filter = "brightness(0.3)";
            }
          }
        }
      }
    }
    
    // Log for debugging
    if (fogOfWarEnabled) {
      console.log("Updated tile visibility. Visible tiles:", 
        visibleTiles.flat().filter(Boolean).length, 
        "out of", 
        mapData.width * mapData.height);
    } else {
      console.log("Fog of war disabled. All tiles are dark.");
    }
  }
  
  // Check if a tile is visible
  function isTileVisible(x: number, y: number): boolean {
    if (!fogOfWarEnabled) return false; // Always return false when fog of war is disabled
    
    // If remember discovered tiles is enabled, show discovered tiles
    if (rememberDiscoveredTiles && discoveredTiles[y][x]) {
      return true;
    }
    
    return visibleTiles[y][x];
  }
  
  // Check if enemy is currently visible
  function isEnemyVisible(): boolean {
    if (!fogOfWarEnabled || !enemy.isAlive) return false; // Return false when fog of war is disabled
    
    const enemyTileX = Math.floor(enemy.position.x / TILE_SIZE);
    const enemyTileY = Math.floor(enemy.position.y / TILE_SIZE);
    
    return isTileVisible(enemyTileX, enemyTileY);
  }
  
  // Handle equipment navigation
  function handleEquipmentNavigation(event: KeyboardEvent) {
    if (!showEquipment) return;
    
    switch(event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        // Toggle between main hand and off hand
        selectedHand = selectedHand === 'mainHand' ? 'offHand' : 'mainHand';
        break;
      case 'Enter':
        // Unequip the selected slot
        if (selectedHand === 'mainHand' && equipment.mainHand) {
          const itemId = equipment.mainHand;
          // Add the item back to inventory
          const existingItem = player.inventory.items.find(i => i.item.id === itemId);
          if (existingItem) {
            existingItem.count++;
          } else {
            // Create a new item entry
            const newItem = createItemStack(itemId);
            if (newItem) {
              player.inventory.items.push(newItem);
            }
          }
          equipment.mainHand = null;
          gameState.addMessage({ text: `You unequipped the ${itemId.replace('_', ' ')} from your main hand.`, level: 'info' });
        } else if (selectedHand === 'offHand' && equipment.offHand) {
          const itemId = equipment.offHand;
          // Add the item back to inventory
          const existingItem = player.inventory.items.find(i => i.item.id === itemId);
          if (existingItem) {
            existingItem.count++;
          } else {
            // Create a new item entry
            const newItem = createItemStack(itemId);
            if (newItem) {
              player.inventory.items.push(newItem);
            }
          }
          equipment.offHand = null;
          gameState.addMessage({ text: `You unequipped the ${itemId.replace('_', ' ')} from your off hand.`, level: 'info' });
        }
        // Update fog of war based on torch equipment
        updateFogOfWarBasedOnTorch();
        break;
      case 's':
      case 'S':
        // Swap items between main hand and off hand
        const mainHandItem = equipment.mainHand;
        const offHandItem = equipment.offHand;
        
        equipment.mainHand = offHandItem;
        equipment.offHand = mainHandItem;
        
        if (mainHandItem && offHandItem) {
          gameState.addMessage({ text: `You swapped the ${mainHandItem.replace('_', ' ')} and ${offHandItem.replace('_', ' ')}.`, level: 'info' });
        } else if (mainHandItem) {
          gameState.addMessage({ text: `You moved the ${mainHandItem.replace('_', ' ')} to your off hand.`, level: 'info' });
        } else if (offHandItem) {
          gameState.addMessage({ text: `You moved the ${offHandItem.replace('_', ' ')} to your main hand.`, level: 'info' });
        } else {
          gameState.addMessage({ text: "You have nothing to swap.", level: 'info' });
        }
        
        // Update fog of war based on torch equipment
        updateFogOfWarBasedOnTorch();
        break;
      case 'Escape':
        // Close equipment menu
        showEquipment = false;
        break;
    }
  }
  
  // Add mobile UI state
  let isMobile = false;
  
  onMount(() => {
    // Check if device is mobile
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Create a more interesting map layout
    createMapLayout();
    
    // Center the player in the viewport
    centerPlayerInViewport();
    
    // Position the enemy
    positionEnemy();
    
    // Add welcome message first
    gameState.addMessage({ text: "Welcome to the game!", level: 'info' });
    gameState.addMessage({ text: "It's dark! Find and equip a torch to see the area around you.", level: 'info' });
    
    // Place a torch on the floor near the player
    placeTorchNearPlayer();
    
    // Start the movement check loop
    requestAnimationFrame(checkMovement);
    
    // Store references to tile elements after the DOM is updated
    setTimeout(() => {
      const tileGrid = document.querySelector('.tile-grid');
      if (tileGrid) {
        tileElements = Array(mapData.height).fill(null).map(() => Array(mapData.width).fill(null));
        
        for (let y = 0; y < mapData.height; y++) {
          for (let x = 0; x < mapData.width; x++) {
            const tileElement = tileGrid.querySelector(`.tile[style*="left: ${x * TILE_SIZE}px"][style*="top: ${y * TILE_SIZE}px"]`);
            if (tileElement) {
              tileElements[y][x] = tileElement as HTMLElement;
            }
          }
        }
        
        // Initialize fog of war AFTER we have collected all tile elements
        initializeFogOfWar();
        
        // Initial update of tile visibility - make everything dark since no torch is equipped
        updateTileVisibility();
        
        // Log for debugging
        console.log("Fog of war initialized. Map is dark since no torch is equipped.");
      }
    }, 100);
    
    return () => {
      // Clean up if needed
    };
  });
  
  // Create a more interesting map layout with grass, water, and walls
  function createMapLayout() {
    // Create a new map layout
    const newTiles = Array(mapData.height).fill(0).map(() => Array(mapData.width).fill(0));
    
    // Add a lake in the middle
    for (let y = 4; y < 9; y++) {
      for (let x = 4; x < 8; x++) {
        newTiles[y][x] = 1; // Water
      }
    }
    
    // Add a small pond
    for (let y = 2; y < 4; y++) {
      for (let x = 15; x < 18; x++) {
        newTiles[y][x] = 1; // Water
      }
    }
    
    // Add walls around the edges
    for (let x = 0; x < mapData.width; x++) {
      newTiles[0][x] = 2; // Wall at top
      newTiles[mapData.height - 1][x] = 2; // Wall at bottom
    }
    
    for (let y = 0; y < mapData.height; y++) {
      newTiles[y][0] = 2; // Wall at left
      newTiles[y][mapData.width - 1] = 2; // Wall at right
    }
    
    // Add some interior walls
    for (let x = 3; x < 7; x++) {
      newTiles[3][x] = 2; // Horizontal wall
    }
    
    for (let y = 3; y < 7; y++) {
      newTiles[y][3] = 2; // Vertical wall
    }
    
    for (let x = 13; x < 17; x++) {
      newTiles[11][x] = 2; // Horizontal wall
    }
    
    for (let y = 8; y < 12; y++) {
      newTiles[y][16] = 2; // Vertical wall
    }
    
    // Add a small island in the lake
    newTiles[7][10] = 0; // Grass in water
    
    // Add dirt paths
    for (let x = 8; x < 12; x++) {
      newTiles[7][x] = 3; // Dirt path
    }
    
    for (let y = 5; y < 8; y++) {
      newTiles[y][10] = 3; // Dirt path
    }
    
    // Add sand area
    for (let y = 12; y < 14; y++) {
      for (let x = 5; x < 10; x++) {
        newTiles[y][x] = 4; // Sand
      }
    }
    
    // Add snow area
    for (let y = 1; y < 3; y++) {
      for (let x = 1; x < 3; x++) {
        newTiles[y][x] = 5; // Snow
      }
    }
    
    // Add mud patches
    newTiles[6][12] = 6; // Mud
    newTiles[6][13] = 6; // Mud
    newTiles[7][12] = 6; // Mud
    
    // Add flower meadow
    for (let y = 9; y < 11; y++) {
      for (let x = 7; x < 9; x++) {
        newTiles[y][x] = 7; // Flowers
      }
    }
    
    // Add trees - more scattered for better gameplay
    newTiles[2][6] = 8; // Tree
    newTiles[3][6] = 8; // Tree
    newTiles[9][6] = 8; // Tree
    newTiles[10][6] = 8; // Tree
    newTiles[11][6] = 8; // Tree
    newTiles[12][6] = 8; // Tree
    newTiles[13][6] = 8; // Tree
    
    // Add more scattered trees
    newTiles[3][8] = 8; // Tree
    newTiles[4][9] = 8; // Tree
    newTiles[6][11] = 8; // Tree
    newTiles[7][12] = 8; // Tree
    newTiles[8][13] = 8; // Tree
    newTiles[9][14] = 8; // Tree
    newTiles[10][15] = 8; // Tree
    
    newTiles[3][12] = 8; // Tree
    newTiles[4][13] = 8; // Tree
    newTiles[5][14] = 8; // Tree
    newTiles[6][15] = 8; // Tree
    newTiles[7][16] = 8; // Tree
    newTiles[8][17] = 8; // Tree
    newTiles[9][18] = 8; // Tree
    
    // Add rocks
    newTiles[4][14] = 9; // Rock
    newTiles[5][14] = 9; // Rock
    newTiles[6][14] = 9; // Rock
    newTiles[7][14] = 9; // Rock
    newTiles[8][14] = 9; // Rock
    newTiles[9][14] = 9; // Rock
    newTiles[10][14] = 9; // Rock
    
    // Add cacti
    newTiles[12][8] = 10; // Cactus
    newTiles[12][9] = 10; // Cactus
    newTiles[12][10] = 10; // Cactus
    newTiles[12][11] = 10; // Cactus
    newTiles[12][12] = 10; // Cactus
    
    // Add house
    newTiles[8][14] = 11; // House
    newTiles[8][15] = 11; // House
    newTiles[9][14] = 11; // House
    newTiles[9][15] = 11; // House
    
    // Add mountain
    newTiles[13][13] = 12; // Mountain
    newTiles[13][14] = 12; // Mountain
    newTiles[13][15] = 12; // Mountain
    newTiles[13][16] = 12; // Mountain
    
    // Add power-up tile
    newTiles[5][15] = 13; // Power-up
    
    // Add treasure tile
    newTiles[7][15] = 14; // Treasure
    
    // Add door/portal
    newTiles[9][15] = 15; // Door
    
    // Add pit/trap
    newTiles[11][15] = 16; // Pit
    
    // Add magic tile
    newTiles[13][15] = 17; // Magic
    
    // Add fire
    newTiles[5][17] = 18; // Fire
    newTiles[6][17] = 18; // Fire
    newTiles[7][17] = 18; // Fire
    
    // Add wind
    newTiles[9][17] = 19; // Wind
    newTiles[10][17] = 19; // Wind
    newTiles[11][17] = 19; // Wind
    
    // Add current in water
    newTiles[5][5] = 20; // Current
    newTiles[6][5] = 20; // Current
    newTiles[7][5] = 20; // Current
    
    // Add key
    newTiles[3][17] = 21; // Key
    
    // Add locked door
    newTiles[5][17] = 22; // Locked door
    
    // Add tool
    newTiles[7][17] = 23; // Tool
    
    // Add scroll
    newTiles[9][17] = 24; // Scroll
    
    // Update the map data
    mapData.tiles = newTiles;
  }
  
  // Place a torch on the floor near the player
  function placeTorchNearPlayer() {
    // Calculate player's tile position
    const playerTileX = Math.floor(player.position.x / TILE_SIZE);
    const playerTileY = Math.floor(player.position.y / TILE_SIZE);
    
    // Find a tile that's a few spaces away from the player
    let torchTileX = playerTileX;
    let torchTileY = playerTileY;
    
    // Define possible directions with distances (2-4 tiles away)
    const directions = [
      { x: 2, y: 0 },
      { x: -2, y: 0 },
      { x: 0, y: 2 },
      { x: 0, y: -2 },
      { x: 3, y: 0 },
      { x: -3, y: 0 },
      { x: 0, y: 3 },
      { x: 0, y: -3 },
      { x: 4, y: 0 },
      { x: -4, y: 0 },
      { x: 0, y: 4 },
      { x: 0, y: -4 },
      // Add some diagonal positions
      { x: 2, y: 2 },
      { x: -2, y: 2 },
      { x: 2, y: -2 },
      { x: -2, y: -2 },
      { x: 3, y: 3 },
      { x: -3, y: 3 },
      { x: 3, y: -3 },
      { x: -3, y: -3 }
    ];
    
    // Shuffle directions to randomize placement
    const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);
    
    // Try to find a valid position
    let found = false;
    for (const dir of shuffledDirections) {
      const newX = playerTileX + dir.x;
      const newY = playerTileY + dir.y;
      
      // Check if the position is within bounds and walkable
      if (newX >= 0 && newX < mapData.width && 
          newY >= 0 && newY < mapData.height && 
          mapData.tiles[newY][newX] === 0) {
        torchTileX = newX;
        torchTileY = newY;
        found = true;
        break;
      }
    }
    
    // If no valid position found at a distance, try adjacent tiles
    if (!found) {
      const adjacentDirections = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 }
      ];
      
      for (const dir of adjacentDirections) {
        const newX = playerTileX + dir.x;
        const newY = playerTileY + dir.y;
        
        if (newX >= 0 && newX < mapData.width && 
            newY >= 0 && newY < mapData.height && 
            mapData.tiles[newY][newX] === 0) {
          torchTileX = newX;
          torchTileY = newY;
          found = true;
          break;
        }
      }
    }
    
    // Add the torch to floor items
    floorItems.push({
      id: 'torch',
      position: { 
        x: torchTileX * TILE_SIZE + TILE_SIZE / 2, 
        y: torchTileY * TILE_SIZE + TILE_SIZE / 2 
      },
      sprite: '🔥'
    });
    
    // Also place an axe near the player
    let axeTileX = playerTileX;
    let axeTileY = playerTileY;
    
    // Try to find a valid position for the axe
    found = false;
    for (const dir of shuffledDirections) {
      const newX = playerTileX + dir.x;
      const newY = playerTileY + dir.y;
      
      // Check if the position is within bounds and walkable
      if (newX >= 0 && newX < mapData.width && 
          newY >= 0 && newY < mapData.height && 
          mapData.tiles[newY][newX] === 0) {
        axeTileX = newX;
        axeTileY = newY;
        found = true;
        break;
      }
    }
    
    // If no valid position found at a distance, try adjacent tiles
    if (!found) {
      const adjacentDirections = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 }
      ];
      
      for (const dir of adjacentDirections) {
        const newX = playerTileX + dir.x;
        const newY = playerTileY + dir.y;
        
        if (newX >= 0 && newX < mapData.width && 
            newY >= 0 && newY < mapData.height && 
            mapData.tiles[newY][newX] === 0) {
          axeTileX = newX;
          axeTileY = newY;
          found = true;
          break;
        }
      }
    }
    
    // Add the axe to floor items
    floorItems.push({
      id: 'axe',
      position: { 
        x: axeTileX * TILE_SIZE + TILE_SIZE / 2, 
        y: axeTileY * TILE_SIZE + TILE_SIZE / 2 
      },
      sprite: '🪓'
    });
    
    // Don't show the message immediately - it will be shown when the player gets close
  }
  
  // Pick up items that are near the player
  function pickupNearbyItems() {
    if (floorItems.length === 0) {
      gameState.addMessage({ text: "There are no items to pick up.", level: 'warning' });
      return;
    }
    
    // Calculate player's tile position
    const playerTileX = Math.floor(player.position.x / TILE_SIZE);
    const playerTileY = Math.floor(player.position.y / TILE_SIZE);
    
    // Check each item on the floor
    let itemsPickedUp = 0;
    const remainingItems = floorItems.filter(item => {
      // Calculate item's tile position
      const itemTileX = Math.floor(item.position.x / TILE_SIZE);
      const itemTileY = Math.floor(item.position.y / TILE_SIZE);
      
      // Check if item is adjacent to player (including diagonally)
      const isAdjacent = Math.abs(playerTileX - itemTileX) <= 1 && 
                         Math.abs(playerTileY - itemTileY) <= 1;
      
      if (isAdjacent) {
        // Add item to inventory
        const existingItem = player.inventory.items.find(i => i.item.id === item.id);
        if (existingItem) {
          existingItem.count++;
        } else {
          // Create a new item entry
          const newItem = createItemStack(item.id);
          if (newItem) {
            player.inventory.items.push(newItem);
          }
        }
        
        gameState.addMessage({ text: `You picked up a ${item.id.replace('_', ' ')}.`, level: 'info' });
        itemsPickedUp++;
        return false; // Remove this item from floor items
      }
      
      return true; // Keep this item on the floor
    });
    
    // Update floor items
    floorItems = remainingItems;
    
    if (itemsPickedUp === 0) {
      gameState.addMessage({ text: "There are no items close enough to pick up.", level: 'warning' });
    }
  }
  
  // Check for nearby items and show appropriate messages
  function checkForNearbyItems() {
    if (floorItems.length === 0) return;
    
    // Calculate player's tile position
    const playerTileX = Math.floor(player.position.x / TILE_SIZE);
    const playerTileY = Math.floor(player.position.y / TILE_SIZE);
    
    // Check each item on the floor
    for (const item of floorItems) {
      // Calculate item's tile position
      const itemTileX = Math.floor(item.position.x / TILE_SIZE);
      const itemTileY = Math.floor(item.position.y / TILE_SIZE);
      
      // Check if item is adjacent to player (including diagonally)
      const isAdjacent = Math.abs(playerTileX - itemTileX) <= 1 && 
                         Math.abs(playerTileY - itemTileY) <= 1;
      
      // If the item is a torch and it's adjacent, show a message
      if (item.id === 'torch' && isAdjacent) {
        // Check if we've already shown this message recently
        const lastMessage = $gameState.messages.find((m: GameMessage) => m.text.includes("torch on the ground"));
        const now = Date.now();
        
        // Only show the message if it's been more than 5 seconds since the last one
        if (!lastMessage || now - lastMessage.timestamp > 5000) {
          gameState.addMessage({ text: "You see a torch on the ground nearby.", level: 'info' });
        }
      }
    }
  }
  
  // Chop down nearby trees
  function chopNearbyTrees() {
    // Check if player has an axe equipped
    if (equipment.mainHand !== 'axe' && equipment.offHand !== 'axe') {
      gameState.addMessage({ text: "You need an axe to chop trees!", level: 'warning' });
      return;
    }
    
    // Calculate player's tile position
    const playerTileX = Math.floor(player.position.x / TILE_SIZE);
    const playerTileY = Math.floor(player.position.y / TILE_SIZE);
    
    // Define directions in clockwise order starting from right
    const directions = [
      { x: 1, y: 0 },   // Right
      { x: 1, y: -1 },  // Up-Right
      { x: 0, y: -1 },  // Up
      { x: -1, y: -1 }, // Up-Left
      { x: -1, y: 0 },  // Left
      { x: -1, y: 1 },  // Down-Left
      { x: 0, y: 1 },   // Down
      { x: 1, y: 1 }    // Down-Right
    ];
    
    // Check each direction in order until a tree is found
    for (const dir of directions) {
      const checkX = playerTileX + dir.x;
      const checkY = playerTileY + dir.y;
      
      // Check if the position is within bounds
      if (checkX >= 0 && checkX < mapData.width && 
          checkY >= 0 && checkY < mapData.height) {
        
        // Check if the tile is a tree
        if (mapData.tiles[checkY][checkX] === 8) { // Tree tile
          // Chop the tree
          chopTree(checkX, checkY);
          return; // Exit after chopping one tree
        }
      }
    }
    
    // If we get here, no trees were found
    gameState.addMessage({ text: "There are no trees nearby to chop.", level: 'warning' });
  }
  
  // Chop a specific tree
  function chopTree(x: number, y: number) {
    // Check if player has an axe equipped
    if (equipment.mainHand !== 'axe' && equipment.offHand !== 'axe') {
      gameState.addMessage({ text: "You need an axe to chop trees!", level: 'warning' });
      return;
    }
    
    // Create a unique key for this tree
    const treeKey = `${x},${y}`;
    
    // Initialize tree health if not already set
    if (treeHealth[treeKey] === undefined) {
      treeHealth[treeKey] = 4; // Trees take 4 hits to chop down
    }
    
    // Apply shake animation to the tree
    // Find the tree element by its position in the tile grid
    const tileElements = document.querySelectorAll('.tile');
    let treeTileElement: HTMLElement | null = null;
    
    // Find the tree element by checking each tile's position
    for (const element of tileElements) {
      const style = window.getComputedStyle(element);
      const left = parseInt(style.left);
      const top = parseInt(style.top);
      
      if (left === x * TILE_SIZE && top === y * TILE_SIZE) {
        // Found the tile, use the parent div element for animation
        treeTileElement = element as HTMLElement;
        break;
      }
    }
    
    if (treeTileElement) {
      console.log("Tree tile element found, applying shake animation");
      
      // Create a unique class name for this animation
      const uniqueClass = `tree-shake-${Date.now()}`;
      
      // Add a style element to the document head with our unique animation
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        @keyframes ${uniqueClass} {
          0% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
          100% { transform: translateX(0); }
        }
        .${uniqueClass} {
          animation: ${uniqueClass} 0.3s ease-in-out;
        }
      `;
      document.head.appendChild(styleElement);
      
      // Add the class to the element
      treeTileElement.classList.add(uniqueClass);
      
      // Remove the class and style element after animation completes
      setTimeout(() => {
        treeTileElement.classList.remove(uniqueClass);
        document.head.removeChild(styleElement);
        console.log("Tree shake animation completed");
        
        // After animation completes, check if tree is fully chopped and update the tile
        if (treeHealth[treeKey] <= 0) {
          // Tree is fully chopped down
          mapData.tiles[y][x] = 0; // Change to grass
          gameState.addMessage({ text: "You chopped down the tree completely!", level: 'info' });
          
          // Add a bit more wood for the final chop
          resources.wood += 2;
          
          // Remove the tree health entry
          delete treeHealth[treeKey];
        }
      }, 300);
    } else {
      console.log(`Tree element not found at position (${x}, ${y})`);
    }
    
    // Reduce tree health
    treeHealth[treeKey]--;
    
    // Add a small amount of wood for each hit
    resources.wood += 1;
    
    // Check if tree is fully chopped - but don't change the tile yet
    if (treeHealth[treeKey] <= 0) {
      // Tree is fully chopped down, but we'll wait for the animation to complete
      // before changing the tile type
    } else {
      // Tree is partially chopped
      const plural = treeHealth[treeKey] === 1 ? 'hit' : 'hits';
      gameState.addMessage({ text: `You chopped the tree! ${treeHealth[treeKey]} more ${plural} to chop it down.`, level: 'info' });
    }
  }
  
  // Handle equipment events from the EquipmentUI component
  function handleEquipmentEvent(event: CustomEvent) {
    const { type, detail } = event;
    
    switch (type) {
      case 'equipmentChange':
        equipment = detail.equipment;
        break;
      case 'fogOfWarChange':
        fogOfWarEnabled = detail.enabled;
        if (fogOfWarEnabled) {
          gameState.addMessage({ text: "Your torch lights up the area around you.", level: 'info' });
          updateVisibility();
        } else {
          gameState.addMessage({ text: "Without a torch, you can't see anything in the darkness.", level: 'info' });
          updateTileVisibility();
          if (enemy.isAlive) {
            enemy.isVisible = false;
          }
        }
        break;
      case 'message':
        gameState.addMessage({ text: detail.text, level: 'info' });
        break;
      case 'close':
        showEquipment = false;
        break;
    }
  }

  // Function to create an item
  function createItem(id: string): Item {
    return {
      id,
      name: id.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: 'A mysterious item',
      type: 'consumable',
      sprite: '❓'
    };
  }

  // Update ItemStack access in the template
  $: displayItems = player.inventory.items.map(itemStack => ({
    id: itemStack.item.id,
    name: itemStack.item.name,
    count: itemStack.count,
    description: itemStack.item.description,
    sprite: itemStack.item.sprite
  }));
</script>

<svelte:window on:keydown={handleKeyDown} on:keyup={handleKeyUp} />

<div class="game-container">
  <div class="game-area">
    <div class="tile-grid">
      {#each mapData.tiles as row, y (y)}
        {#each row as tile, x (x)}
          <div 
            class="tile" 
            style="left: {x * TILE_SIZE}px; top: {y * TILE_SIZE}px;"
          >
            <span class="tile-emoji">{tileEmojis[tile]}</span>
          </div>
        {/each}
      {/each}
    </div>
    
    <div 
      class="player" 
      style="left: {player.position.x - 16 + 1}px; top: {player.position.y - 16 + 1}px;"
    >
      {#if isPlayerDefeated}
        <span class="player-emoji">🪦</span>
      {:else}
        <span class="player-emoji">🧙</span>
      {/if}
    </div>
    
    {#if enemy.isAlive}
      <div 
        class="enemy" 
        class:fog-hidden={!fogOfWarEnabled || !enemy.isVisible}
        style="left: {enemy.position.x - 16 + 1}px; top: {enemy.position.y - 16 + 1}px;"
      >
        <span class="enemy-emoji">{enemy.sprite}</span>
      </div>
    {/if}
    
    <!-- Floor items -->
    {#each floorItems as item}
      <div 
        class="floor-item" 
        class:fog-hidden={!fogOfWarEnabled || !isTileVisible(Math.floor(item.position.x / TILE_SIZE), Math.floor(item.position.y / TILE_SIZE))}
        style="left: {item.position.x - 16 + 1}px; top: {item.position.y - 16 + 1}px;"
      >
        <span class="item-emoji">{item.sprite}</span>
      </div>
    {/each}
    
    <!-- Grid overlay -->
    <div class="grid-overlay"></div>
  </div>
  
  <!-- Mobile Controls -->
  {#if isMobile}
    <div class="mobile-controls">
      <div class="mobile-buttons">
        <button class="mobile-button" on:click={() => moveInDirection('up')}>⬆️</button>
        <div class="horizontal-buttons">
          <button class="mobile-button" on:click={() => moveInDirection('left')}>⬅️</button>
          <button class="mobile-button" on:click={() => moveInDirection('right')}>➡️</button>
        </div>
        <button class="mobile-button" on:click={() => moveInDirection('down')}>⬇️</button>
      </div>
      <div class="action-buttons">
        <button class="action-button" on:click={pickupNearbyItems}>🔍 Pick Up</button>
        <button class="action-button" on:click={() => showInventory = !showInventory}>🎒 Inventory</button>
        <button class="action-button" on:click={() => showEquipment = !showEquipment}>⚔️ Equipment</button>
      </div>
    </div>
  {/if}
  
  <MessageLog />
  
  <!-- Battle UI (shown when in battle) -->
  {#if isInBattle}
    <Battle playerParty={[player]} enemyParty={[enemy]} />
  {/if}
  
  <!-- Inventory UI (shown when Tab is pressed) -->
  {#if showInventory}
    <div class="inventory-ui">
      <h2>🎒 Inventory</h2>
      <div class="gold-display">
        <span class="gold-icon">💰</span> {player.inventory.gold}
      </div>
      
      <div class="inventory-items">
        <h3>Items</h3>
        {#if player.inventory.items.length === 0}
          <p class="empty-inventory">No items</p>
        {:else}
          {#each player.inventory.items as itemStack, index}
            <div 
              class="inventory-item" 
              class:selected={index === selectedItemIndex}
            >
              <div class="item-info">
                <span class="item-emoji">{itemStack.item.sprite}</span>
                <span class="item-name">{itemStack.item.name}</span>
                <span class="item-count">x{itemStack.count}</span>
              </div>
              <div class="item-description">{itemStack.item.description}</div>
              {#if isInBattle}
                <div class="item-use-hint">Press ENTER to use</div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
      
      <div class="active-effects">
        <h3>✨ Active Effects</h3>
        {#if activeEffects.strength.active}
          <div class="effect">
            <span class="effect-emoji">💪</span>
            <span class="effect-name">Strength Boost</span>
            <span class="effect-duration">{activeEffects.strength.turnsRemaining} turns remaining</span>
          </div>
        {:else}
          <p class="no-effects">No active effects</p>
        {/if}
      </div>
      
      <div class="inventory-instructions">
        <p>Use UP/DOWN arrows to select items, ENTER to use, ESC to close</p>
      </div>
    </div>
  {/if}
  
  <!-- Equipment UI (shown when E is pressed) -->
  <EquipmentUI 
    {showEquipment} 
    {equipment} 
    {selectedHand} 
    {isMobile}
    inventory={player.inventory}
    on:equipmentChange={handleEquipmentEvent}
    on:fogOfWarChange={handleEquipmentEvent}
    on:message={handleEquipmentEvent}
    on:close={handleEquipmentEvent}
  />
  
  <!-- Game info -->
  <GameInfo 
    {gameTick}
    playerHealth={player.health}
    playerMaxHealth={player.maxHealth}
    gold={player.inventory.gold}
    wood={resources.wood}
    {isPlayerDefeated}
    {monstersHostile}
  />
</div>

<style>
  .game-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #000;
    position: relative;
    font-family: 'Noto Color Emoji', monospace;
    /* font-family: 'Noto Emoji', monospace; */
  }
  
  .game-area {
    position: absolute;
    width: 640px; /* 20 tiles * 32px */
    height: 480px; /* 15 tiles * 32px */
    border: 2px solid #333;
    overflow: hidden;
    background-color: #222; /* Dark background to help identify the black lines */
    cursor: default; /* Change cursor to normal pointer */
  }
  
  .tile-grid {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  
  .tile {
    position: absolute;
    width: 32px;
    height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    border: none;
    /* Start tiles dimmed by default */
    opacity: 0.2;
    filter: brightness(0.3);
    transition: opacity 0.3s ease, filter 0.3s ease; /* Update transition */
  }
  
  .fog-hidden {
    opacity: 0.2 !important;
    filter: brightness(0.3) !important;
    transition: opacity 0.3s ease, filter 0.3s ease;
  }
  
  .tile-emoji {
    font-size: 28px;
  }
  
  .player, .enemy, .floor-item {
    position: absolute;
    width: 31px;
    height: 31px;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1;
    transition: opacity 0.3s ease, filter 0.3s ease;
  }
  
  .player-emoji, .enemy-emoji, .item-emoji {
    font-size: 24px;
  }
  
  .grid-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    box-shadow: 
      inset 0 0 0 1px rgba(50, 50, 50, 0.2),
      inset 32px 0 0 -31px rgba(50, 50, 50, 0.2),
      inset 0 32px 0 -31px rgba(50, 50, 50, 0.2);
  }
  
  .inventory-ui {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    max-width: 500px;
    background-color: rgba(0, 0, 0, 0.9);
    border: 2px solid #555;
    border-radius: 8px;
    padding: 20px;
    color: white;
    z-index: 20;
  }
  
  .gold-display {
    font-size: 24px;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
  }
  
  .gold-icon {
    margin-right: 10px;
  }
  
  .inventory-items {
    margin-bottom: 20px;
  }
  
  .inventory-item {
    display: flex;
    flex-direction: column;
    padding: 10px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    margin-bottom: 10px;
    border: 2px solid transparent;
  }
  
  .inventory-item.selected {
    border-color: #FFC107;
    background-color: rgba(255, 193, 7, 0.2);
  }
  
  .item-info {
    display: flex;
    align-items: center;
    margin-bottom: 5px;
  }
  
  .item-emoji {
    font-size: 20px;
    margin-right: 10px;
  }
  
  .item-name {
    font-weight: bold;
    flex-grow: 1;
  }
  
  .item-count {
    color: #aaa;
  }
  
  .item-description {
    font-size: 14px;
    color: #aaa;
    margin-bottom: 10px;
  }
  
  .item-use-hint {
    font-size: 12px;
    color: #4CAF50;
    text-align: right;
    font-style: italic;
  }
  
  .active-effects {
    margin-bottom: 20px;
  }
  
  .effect {
    display: flex;
    align-items: center;
    padding: 10px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    margin-bottom: 10px;
  }
  
  .effect-emoji {
    font-size: 20px;
    margin-right: 10px;
  }
  
  .effect-name {
    font-weight: bold;
    color: #FFC107;
    flex-grow: 1;
  }
  
  .effect-duration {
    color: #aaa;
  }
  
  .empty-inventory, .no-effects {
    color: #aaa;
    font-style: italic;
  }
  
  .inventory-instructions {
    text-align: center;
    font-size: 14px;
    color: #aaa;
    margin-top: 15px;
  }
  
  .item-emoji {
    font-size: 24px;
  }
  
  .item-name {
    font-weight: bold;
    text-align: center;
  }
  
  .item-description {
    font-size: 12px;
    color: #aaa;
    text-align: center;
    max-width: 200px;
    word-wrap: break-word;
  }
  
  .action-button {
    padding: 8px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    text-align: center;
    font-size: 14px;
  }
  
  /* Mobile Responsive Styles */
  @media (max-width: 768px) {
    .game-container {
      flex-direction: column;
      padding: 10px;
    }
    
    .game-area {
      width: 100%;
      height: auto;
      aspect-ratio: 4/3;
      max-width: 100vw;
      max-height: 70vh;
    }
    
    .tile {
      width: calc(100% / 20);
      height: calc(100% / 15);
    }
    
    .tile-emoji {
      font-size: clamp(16px, 4vw, 28px);
    }
    
    .player-emoji, .enemy-emoji, .item-emoji {
      font-size: clamp(16px, 4vw, 24px);
    }
  }
  
  /* Mobile Controls */
  .mobile-controls {
    position: fixed;
    bottom: 20px;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 10px;
    z-index: 100;
  }
  
  .mobile-buttons {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  
  .horizontal-buttons {
    display: flex;
    gap: 20px;
  }
  
  .mobile-button {
    width: 60px;
    height: 60px;
    border: none;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    touch-action: manipulation;
  }
  
  .action-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .action-button {
    padding: 10px 20px;
    border: none;
    border-radius: 20px;
    background-color: rgba(33, 150, 243, 0.8);
    color: white;
    font-size: 16px;
    touch-action: manipulation;
  }
  
  /* Prevent text selection during touch */
  .game-container {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
</style> 