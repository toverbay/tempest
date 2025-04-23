<script lang="ts">
  import type { Character } from './types/Character';
  import { onMount } from 'svelte';
  
  export let player: Character;
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
  let playerInventory = {
    gold: 0,
    items: [
      { id: 'health_potion', name: 'Health Potion', count: 3, description: 'Restores 30 HP', emoji: '🧪' },
      { id: 'strength_potion', name: 'Strength Potion', count: 1, description: 'Increases attack damage by 50% for 3 turns', emoji: '💪' }
    ]
  };
  
  // Items on the floor
  let floorItems: { id: string, position: { x: number, y: number }, emoji: string }[] = [];
  
  // Equipment slots
  let equipment = {
    mainHand: null as string | null,
    offHand: null as string | null
  };
  
  // Item effects
  let activeEffects = {
    strength: { active: false, turnsRemaining: 0 }
  };
  
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
  
  // Fog of war system
  let visibleTiles: boolean[][] = [];
  let discoveredTiles: boolean[][] = [];
  const VISIBILITY_RADIUS = 3; // Number of tiles visible in each direction
  let fogOfWarEnabled = false; // Disabled by default since no torch is equipped
  let rememberDiscoveredTiles = true; // Set to false to hide previously discovered tiles
  let visibilityUpdateCounter = 0; // Counter to force reactivity
  let tileElements: HTMLElement[][] = []; // Store references to tile elements
  let fogOfWarInitialized = false; // Flag to track if fog of war has been initialized
  
  // Message log system
  let gameMessages: { text: string, timestamp: number }[] = [];
  const MAX_MESSAGES = 50;
  let messageLogElement: HTMLDivElement;
  
  // Message cooldown system
  let lastWallMessageTime = 0;
  let lastWaterMessageTime = 0;
  const MESSAGE_COOLDOWN = 1000; // 1 second cooldown
  
  // Inventory navigation
  let selectedItemIndex = 0;
  
  // Equipment navigation
  let showEquipment = false;
  let selectedEquipmentSlot: 'mainHand' | 'offHand' = 'mainHand';
  
  // Enemy definition
  let enemy = {
    position: { x: 0, y: 0 },
    health: 100,
    maxHealth: 100,
    name: "Slime",
    isAlive: true,
    emoji: "🟣",
    loot: {
      gold: { min: 5, max: 15 },
      items: [
        { id: 'health_potion', chance: 0.3 },
        { id: 'strength_potion', chance: 0.1 }
      ]
    },
    isVisible: true // Add a property to track enemy visibility
  };
  
  // Emoji mappings for tiles
  const tileEmojis: { [key: number]: string } = {
    0: "🟩", // grass
    1: "🟦", // water (changed from droplet to blue square)
    2: "🧱"  // wall
  };
  
  // Function to add a message to the log with cooldown for specific messages
  function addMessage(text: string) {
    const timestamp = Date.now();
    
    // Check for wall message cooldown
    if (text === "You can't walk through walls!" && timestamp - lastWallMessageTime < MESSAGE_COOLDOWN) {
      return; // Skip adding the message if on cooldown
    }
    
    // Check for water message cooldown
    if (text === "You can't walk on water!" && timestamp - lastWaterMessageTime < MESSAGE_COOLDOWN) {
      return; // Skip adding the message if on cooldown
    }
    
    // Update cooldown timers
    if (text === "You can't walk through walls!") {
      lastWallMessageTime = timestamp;
    } else if (text === "You can't walk on water!") {
      lastWaterMessageTime = timestamp;
    }
    
    gameMessages = [...gameMessages, { text, timestamp }].slice(-MAX_MESSAGES);
    
    // Scroll to the bottom of the message log after the DOM updates
    setTimeout(() => {
      if (messageLogElement) {
        messageLogElement.scrollTop = messageLogElement.scrollHeight;
      }
    }, 0);
  }
  
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
        addMessage("Your torch lights up the area around you.");
        updateVisibility();
      } else {
        addMessage("Without a torch, you can't see anything in the darkness.");
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
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D', 'i', 'I', 'Enter', 'Escape', 'Tab', 'e', 'E', 'p', 'P'].includes(event.key)) {
      event.preventDefault();
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
        selectedEquipmentSlot = 'mainHand';
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
          if (selectedItemIndex < playerInventory.items.length - 1) {
            selectedItemIndex++;
          }
          break;
        case 'Enter':
          // Use selected item
          if (playerInventory.items.length > 0) {
            const selectedItem = playerInventory.items[selectedItemIndex];
            useItem(selectedItem.id);
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
            addMessage("You successfully fled from battle!");
            endBattle();
          } else {
            addMessage("Failed to flee! The enemy attacks!");
            const enemyDamage = Math.floor(Math.random() * 15) + 5;
            player.health -= enemyDamage;
            addMessage(`${enemy.name} attacks for ${enemyDamage} damage!`);
            
            if (player.health <= 0) {
              player.health = 0;
              addMessage("Player has been defeated!");
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
    
    // Check if the new tile is walkable (not water or wall)
    const newTileType = mapData.tiles[newTileY][newTileX];
    if (newTileType === 1) { // Water
      addMessage("You can't walk on water!");
      return false; // Return false to indicate no movement occurred
    } else if (newTileType === 2) { // Wall
      addMessage("You can't walk through walls!");
      return false; // Return false to indicate no movement occurred
    }
    
    // Set target position to the center of the new tile
    targetPosition.x = newTileX * TILE_SIZE + TILE_SIZE / 2;
    targetPosition.y = newTileY * TILE_SIZE + TILE_SIZE / 2;
    
    // Start movement animation
    isMoving = true;
    animateMovement();
    
    return true; // Return true to indicate movement occurred
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
    if (isInBattle || !enemy.isAlive) return;
    
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
    addMessage(`Battle started with ${enemy.name}!`);
    
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
          addMessage("Strength potion effect applied to attack!");
        }
        
        enemy.health -= damage;
        addMessage(`Player attacks ${enemy.name} for ${damage} damage!`);
        
        // Check if enemy is defeated
        if (enemy.health <= 0) {
          enemy.health = 0;
          enemy.isAlive = false;
          addMessage(`${enemy.name} has been defeated!`);
          
          // Award loot to player
          awardLoot();
          
          endBattle();
        } else {
          // Enemy counter-attacks
          const enemyDamage = Math.floor(Math.random() * 15) + 5; // 5-20 damage
          player.health -= enemyDamage;
          addMessage(`${enemy.name} counter-attacks for ${enemyDamage} damage!`);
          
          // Check if player is defeated
          if (player.health <= 0) {
            player.health = 0;
            isPlayerDefeated = true;
            addMessage("Player has been defeated!");
            endBattle();
          }
        }
        break;
        
      case 'defend':
        // Player defends (reduces incoming damage)
        addMessage("Player takes a defensive stance!");
        // Enemy still attacks but with reduced damage
        const reducedDamage = Math.floor(Math.random() * 10) + 3; // 3-13 damage
        player.health -= reducedDamage;
        addMessage(`${enemy.name} attacks for ${reducedDamage} damage!`);
        
        // Check if player is defeated
        if (player.health <= 0) {
          player.health = 0;
          isPlayerDefeated = true;
          addMessage("Player has been defeated!");
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
    // Award gold
    const goldAmount = Math.floor(Math.random() * (enemy.loot.gold.max - enemy.loot.gold.min + 1)) + enemy.loot.gold.min;
    playerInventory.gold += goldAmount;
    addMessage(`You found ${goldAmount} gold!`);
    
    // Award items based on chance
    for (const item of enemy.loot.items) {
      if (Math.random() < item.chance) {
        // Find if player already has this item
        const existingItem = playerInventory.items.find(i => i.id === item.id);
        
        if (existingItem) {
          // Increment count if player already has this item
          existingItem.count++;
        } else {
          // Add new item to inventory
          const newItem = createItem(item.id);
          if (newItem) {
            playerInventory.items.push(newItem);
          }
        }
        
        addMessage(`You found a ${item.id.replace('_', ' ')}!`);
      }
    }
  }
  
  // Create an item based on its ID
  function createItem(id: string) {
    switch (id) {
      case 'health_potion':
        return { id, name: 'Health Potion', count: 1, description: 'Restores 30 HP', emoji: '🧪' };
      case 'strength_potion':
        return { id, name: 'Strength Potion', count: 1, description: 'Increases attack damage by 50% for 3 turns', emoji: '💪' };
      case 'torch':
        return { id, name: 'Torch', count: 1, description: 'Lights up the area around you', emoji: '🔥' };
      default:
        return null;
    }
  }
  
  // Use an item from inventory
  function useItem(itemId: string) {
    const item = playerInventory.items.find(i => i.id === itemId);
    
    if (!item || item.count <= 0) {
      addMessage("You don't have that item!");
      return;
    }
    
    // Decrease item count
    item.count--;
    
    // Apply item effect
    switch (itemId) {
      case 'health_potion':
        const healing = 30;
        player.health = Math.min(player.health + healing, player.maxHealth);
        addMessage(`You used a Health Potion and recovered ${healing} HP!`);
        // If player was defeated, they are now revived
        if (isPlayerDefeated) {
          isPlayerDefeated = false;
          addMessage("You have been revived!");
        }
        break;
        
      case 'strength_potion':
        activeEffects.strength.active = true;
        activeEffects.strength.turnsRemaining = 3;
        addMessage("You used a Strength Potion! Attack damage increased for 3 turns.");
        break;
        
      case 'torch':
        // Equip torch to main hand if empty, otherwise off hand
        if (!equipment.mainHand) {
          equipment.mainHand = 'torch';
          addMessage("You equipped the torch in your main hand.");
        } else if (!equipment.offHand) {
          equipment.offHand = 'torch';
          addMessage("You equipped the torch in your off hand.");
        } else {
          // Both hands are full, ask which to replace
          addMessage("Both hands are full. Press 'E' to open equipment menu and manage your equipment.");
          // Add the torch back to inventory since it wasn't used
          item.count++;
        }
        // Update fog of war based on torch equipment
        updateFogOfWarBasedOnTorch();
        break;
    }
    
    // Remove item if count is 0
    if (item.count <= 0) {
      playerInventory.items = playerInventory.items.filter(i => i.id !== itemId);
      // Adjust selected index if needed
      if (selectedItemIndex >= playerInventory.items.length) {
        selectedItemIndex = Math.max(0, playerInventory.items.length - 1);
      }
    }
    
    // Force Svelte to recognize the change by creating a new array
    playerInventory = {...playerInventory};
    
    // Close inventory if in battle
    if (isInBattle) {
      showInventory = false;
      
      // Enemy still attacks
      const itemEnemyDamage = Math.floor(Math.random() * 15) + 5; // 5-20 damage
      player.health -= itemEnemyDamage;
      addMessage(`${enemy.name} attacks for ${itemEnemyDamage} damage!`);
      
      // Check if player is defeated
      if (player.health <= 0) {
        player.health = 0;
        addMessage("Player has been defeated!");
        endBattle();
      }
      
      // Advance game tick after using item
      advanceGameTick();
    }
  }
  
  // End the battle
  function endBattle() {
    isInBattle = false;
    addMessage("Battle ended!");
    
    // If enemy was defeated, spawn a new one after a delay
    if (!enemy.isAlive) {
      setTimeout(() => {
        respawnEnemy();
      }, 5000); // Respawn after 5 seconds
    }
    
    // If player is defeated, show a message about using a health potion to revive
    if (isPlayerDefeated) {
      addMessage("You are defeated! Use a Health Potion to revive.");
    }
  }
  
  // Respawn enemy
  function respawnEnemy() {
    enemy = {
      position: { x: 0, y: 0 },
      health: 100,
      maxHealth: 100,
      name: "Slime",
      isAlive: true,
      emoji: "🟣",
      loot: {
        gold: { min: 5, max: 15 },
        items: [
          { id: 'health_potion', chance: 0.3 },
          { id: 'strength_potion', chance: 0.1 }
        ]
      },
      isVisible: true // Initialize visibility
    };
    
    // Position the enemy at a random location
    positionEnemy();
    
    // Update enemy visibility based on its position
    if (fogOfWarEnabled) {
      const enemyTileX = Math.floor(enemy.position.x / TILE_SIZE);
      const enemyTileY = Math.floor(enemy.position.y / TILE_SIZE);
      enemy.isVisible = isTileVisible(enemyTileX, enemyTileY);
    }
    
    addMessage("A new enemy has appeared!");
  }
  
  // Advance the game tick
  function advanceGameTick() {
    gameTick++;
    
    // Update active effects
    if (activeEffects.strength.active) {
      activeEffects.strength.turnsRemaining--;
      if (activeEffects.strength.turnsRemaining <= 0) {
        activeEffects.strength.active = false;
        addMessage("Strength potion effect has worn off.");
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
          // Calculate distance from player (using Manhattan distance for simplicity)
          const distance = Math.abs(x) + Math.abs(y);
          
          // If within visibility radius, mark as visible and discovered
          if (distance <= VISIBILITY_RADIUS) {
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
        selectedEquipmentSlot = selectedEquipmentSlot === 'mainHand' ? 'offHand' : 'mainHand';
        break;
      case 'Enter':
        // Unequip the selected slot
        if (selectedEquipmentSlot === 'mainHand' && equipment.mainHand) {
          const itemId = equipment.mainHand;
          // Add the item back to inventory
          const existingItem = playerInventory.items.find(i => i.id === itemId);
          if (existingItem) {
            existingItem.count++;
          } else {
            // Create a new item entry
            const newItem = createItem(itemId);
            if (newItem) {
              playerInventory.items.push(newItem);
            }
          }
          equipment.mainHand = null;
          addMessage(`You unequipped the ${itemId.replace('_', ' ')} from your main hand.`);
        } else if (selectedEquipmentSlot === 'offHand' && equipment.offHand) {
          const itemId = equipment.offHand;
          // Add the item back to inventory
          const existingItem = playerInventory.items.find(i => i.id === itemId);
          if (existingItem) {
            existingItem.count++;
          } else {
            // Create a new item entry
            const newItem = createItem(itemId);
            if (newItem) {
              playerInventory.items.push(newItem);
            }
          }
          equipment.offHand = null;
          addMessage(`You unequipped the ${itemId.replace('_', ' ')} from your off hand.`);
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
          addMessage(`You swapped the ${mainHandItem.replace('_', ' ')} and ${offHandItem.replace('_', ' ')}.`);
        } else if (mainHandItem) {
          addMessage(`You moved the ${mainHandItem.replace('_', ' ')} to your off hand.`);
        } else if (offHandItem) {
          addMessage(`You moved the ${offHandItem.replace('_', ' ')} to your main hand.`);
        } else {
          addMessage("You have nothing to swap.");
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
  
  // Start the game loop when the component is mounted
  onMount(() => {
    // Create a more interesting map layout
    createMapLayout();
    
    // Center the player in the viewport
    centerPlayerInViewport();
    
    // Position the enemy
    positionEnemy();
    
    // Add welcome message first
    addMessage("Welcome to the game! Use arrow keys to move.");
    addMessage("Press P to pick up items near you.");
    addMessage("It's dark! Find and equip a torch to see the area around you.");
    
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
      emoji: '🔥'
    });
    
    // Don't show the message immediately - it will be shown when the player gets close
  }
  
  // Pick up items that are near the player
  function pickupNearbyItems() {
    if (floorItems.length === 0) {
      addMessage("There are no items to pick up.");
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
        const existingItem = playerInventory.items.find(i => i.id === item.id);
        if (existingItem) {
          existingItem.count++;
        } else {
          // Create a new item entry
          const newItem = createItem(item.id);
          if (newItem) {
            playerInventory.items.push(newItem);
          }
        }
        
        addMessage(`You picked up a ${item.id.replace('_', ' ')}.`);
        itemsPickedUp++;
        return false; // Remove this item from floor items
      }
      
      return true; // Keep this item on the floor
    });
    
    // Update floor items
    floorItems = remainingItems;
    
    if (itemsPickedUp === 0) {
      addMessage("There are no items close enough to pick up.");
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
        const lastMessage = gameMessages.find(m => m.text.includes("torch on the ground"));
        const now = Date.now();
        
        // Only show the message if it's been more than 5 seconds since the last one
        if (!lastMessage || now - lastMessage.timestamp > 5000) {
          addMessage("You see a torch on the ground nearby.");
        }
      }
    }
  }
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
        <span class="enemy-emoji">{enemy.emoji}</span>
      </div>
    {/if}
    
    <!-- Floor items -->
    {#each floorItems as item}
      <div 
        class="floor-item" 
        class:fog-hidden={!fogOfWarEnabled || !isTileVisible(Math.floor(item.position.x / TILE_SIZE), Math.floor(item.position.y / TILE_SIZE))}
        style="left: {item.position.x - 16 + 1}px; top: {item.position.y - 16 + 1}px;"
      >
        <span class="item-emoji">{item.emoji}</span>
      </div>
    {/each}
    
    <!-- Grid overlay -->
    <div class="grid-overlay"></div>
  </div>
  
  <!-- Message log -->
  <div class="message-log">
    <div class="message-container" bind:this={messageLogElement}>
      {#each gameMessages as message}
        <div class="message">
          {message.text}
        </div>
      {/each}
    </div>
  </div>
  
  <!-- Battle UI (shown when in battle) -->
  {#if isInBattle}
    <div class="battle-ui">
      <div class="battle-info">
        <div class="player-stats">
          <h3>🧙 Player</h3>
          <div class="health-bar">
            <div class="health-fill" style="width: {(player.health / player.maxHealth) * 100}%"></div>
          </div>
          <p>❤️ HP: {player.health}/{player.maxHealth}</p>
        </div>
        
        <div class="enemy-stats">
          <h3>{enemy.emoji} {enemy.name}</h3>
          <div class="health-bar">
            <div class="health-fill" style="width: {(enemy.health / enemy.maxHealth) * 100}%"></div>
          </div>
          <p>❤️ HP: {enemy.health}/{enemy.maxHealth}</p>
        </div>
      </div>
      
      <div class="battle-actions">
        <div class="action-option">⚔️ Attack (A)</div>
        <div class="action-option">🛡️ Defend (D)</div>
        <div class="action-option">🎒 Use Item (I)</div>
        <div class="action-option">🏃 Flee (ESC)</div>
      </div>
      
      <div class="battle-instructions">
        <p>Press A to Attack, D to Defend, I to Use Item, or ESC to try to flee</p>
      </div>
    </div>
  {/if}
  
  <!-- Inventory UI (shown when Tab is pressed) -->
  {#if showInventory}
    <div class="inventory-ui">
      <h2>🎒 Inventory</h2>
      <div class="gold-display">
        <span class="gold-icon">💰</span> {playerInventory.gold}
      </div>
      
      <div class="inventory-items">
        <h3>Items</h3>
        {#if playerInventory.items.length === 0}
          <p class="empty-inventory">No items</p>
        {:else}
          {#each playerInventory.items as item, index}
            <div 
              class="inventory-item" 
              class:selected={index === selectedItemIndex}
            >
              <div class="item-info">
                <span class="item-emoji">{item.emoji}</span>
                <span class="item-name">{item.name}</span>
                <span class="item-count">x{item.count}</span>
              </div>
              <div class="item-description">{item.description}</div>
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
  {#if showEquipment}
    <div class="equipment-ui">
      <h2>⚔️ Equipment</h2>
      
      <div class="equipment-slots">
        <div 
          class="equipment-slot" 
          class:selected={selectedEquipmentSlot === 'mainHand'}
        >
          <div class="slot-label">Main Hand</div>
          <div class="slot-content">
            {#if equipment.mainHand}
              <div class="equipped-item">
                <span class="item-emoji">{createItem(equipment.mainHand)?.emoji || '❓'}</span>
                <span class="item-name">{createItem(equipment.mainHand)?.name || 'Unknown Item'}</span>
              </div>
            {:else}
              <div class="empty-slot">Empty</div>
            {/if}
          </div>
        </div>
        
        <div 
          class="equipment-slot" 
          class:selected={selectedEquipmentSlot === 'offHand'}
        >
          <div class="slot-label">Off Hand</div>
          <div class="slot-content">
            {#if equipment.offHand}
              <div class="equipped-item">
                <span class="item-emoji">{createItem(equipment.offHand)?.emoji || '❓'}</span>
                <span class="item-name">{createItem(equipment.offHand)?.name || 'Unknown Item'}</span>
              </div>
            {:else}
              <div class="empty-slot">Empty</div>
            {/if}
          </div>
        </div>
      </div>
      
      <div class="equipment-actions">
        <div class="action-button">ENTER - Unequip selected item</div>
        <div class="action-button">S - Swap items between hands</div>
      </div>
      
      <div class="equipment-instructions">
        <p>Use UP/DOWN arrows to select slot, ENTER to unequip, S to swap, ESC to close</p>
      </div>
    </div>
  {/if}
  
  <!-- Game info -->
  <div class="game-info">
    <p>⏱️ Game Tick: {gameTick}</p>
    <p>❤️ Player HP: {player.health}/{player.maxHealth}</p>
    <p>💰 Gold: {playerInventory.gold}</p>
    <p>⌨️ Controls: Arrow keys to move, A/D/I for battle actions, TAB for inventory</p>
    <p>🔍 Press P to pick up items near you</p>
    {#if isPlayerDefeated}
      <p class="defeated-message">💀 You are defeated! Use a Health Potion to revive.</p>
    {/if}
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap');
  
  .game-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #000;
    position: relative;
    font-family: 'Noto Color Emoji', monospace;
  }
  
  .game-area {
    position: relative;
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
    transition: opacity 0.3s ease;
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
  
  .vertical {
    width: 1px;
    height: 100%;
  }
  
  .horizontal {
    height: 1px;
    width: 100%;
  }
  
  .message-log {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 300px;
    max-height: 300px;
    background-color: rgba(0, 0, 0, 0.7);
    border: 2px solid #555;
    border-radius: 8px;
    padding: 10px;
    color: white;
    font-size: 14px;
    z-index: 5;
    display: flex;
    flex-direction: column;
  }
  
  .message-container {
    overflow-y: auto;
    max-height: 280px;
    padding-right: 5px;
  }
  
  .message-container::-webkit-scrollbar {
    width: 8px;
  }
  
  .message-container::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
  }
  
  .message-container::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
  }
  
  .message-container::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }
  
  .message {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .message:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
  
  .battle-ui {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    max-width: 600px;
    background-color: rgba(0, 0, 0, 0.8);
    border: 2px solid #555;
    border-radius: 8px;
    padding: 15px;
    color: white;
    z-index: 10;
  }
  
  .battle-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
  }
  
  .player-stats, .enemy-stats {
    width: 45%;
  }
  
  .health-bar {
    width: 100%;
    height: 20px;
    background-color: #333;
    border-radius: 4px;
    overflow: hidden;
    margin: 5px 0;
  }
  
  .health-fill {
    height: 100%;
    background-color: #4CAF50;
    transition: width 0.3s ease;
  }
  
  .enemy-stats .health-fill {
    background-color: #F44336;
  }
  
  .battle-actions {
    display: flex;
    justify-content: space-around;
    margin-bottom: 10px;
  }
  
  .action-option {
    padding: 8px 16px;
    background-color: #2196F3;
    color: white;
    border-radius: 4px;
    font-weight: bold;
  }
  
  .battle-instructions {
    margin-top: 10px;
    text-align: center;
    font-size: 14px;
    color: #aaa;
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
  
  .game-info {
    position: absolute;
    top: 10px;
    left: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 14px;
    max-width: 250px; /* Increased from 200px to 250px */
    z-index: 5; /* Ensure it's above the game area */
  }
  
  .defeated-message {
    color: #ff5555;
    font-weight: bold;
    margin-top: 5px;
  }
  
  .equipment-ui {
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
  
  .equipment-slots {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin: 20px 0;
  }
  
  .equipment-slot {
    display: flex;
    flex-direction: column;
    padding: 10px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    border: 2px solid transparent;
  }
  
  .equipment-slot.selected {
    border-color: #FFC107;
    background-color: rgba(255, 193, 7, 0.2);
  }
  
  .slot-label {
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  .slot-content {
    min-height: 40px;
    display: flex;
    align-items: center;
  }
  
  .equipped-item {
    display: flex;
    align-items: center;
  }
  
  .empty-slot {
    color: #aaa;
    font-style: italic;
  }
  
  .equipment-instructions {
    text-align: center;
    font-size: 14px;
    color: #aaa;
    margin-top: 15px;
  }
  
  .equipment-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 15px 0;
  }
  
  .action-button {
    padding: 8px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    text-align: center;
    font-size: 14px;
  }
</style> 