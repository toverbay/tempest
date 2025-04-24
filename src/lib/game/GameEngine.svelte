<script lang="ts">
  import { onMount } from 'svelte';
  import WorldMap from './WorldMap.svelte';
  import Battle from './components/Battle.svelte';
  import type { Character, PlayerCharacter } from './types/';
  
  // Game state
  let gameState: 'world' | 'battle' | 'menu' = 'world';
  
  // Player character
  const player: PlayerCharacter = {
    id: 'player1',
    name: 'Hero',
    level: 1,
    health: 100,
    maxHealth: 100,
    isAlive: true,
    isVisible: true,
    stats: {
      strength: 15,
      defense: 10,
      magic: 8,
      speed: 12,
      mp: 50,
      maxMp: 50
    },
    position: { x: 160, y: 160 },
    sprite: '🧙',
    isPlayer: true,
    inventory: {
      gold: 0,
      items: []
    },
    equipment: {
      weapon: null,
      armor: null,
      accessory: null
    }
  };
  
  // Sample enemy for testing
  const enemy: Character = {
    id: 'enemy1',
    name: 'Slime',
    level: 1,
    isAlive: true,
    isVisible: true,
    stats: {
      strength: 8,
      defense: 5,
      magic: 0,
      speed: 6,
      mp: 0,
      maxMp: 0
    },
    position: { x: 0, y: 0 },
    sprite: '🟢',
    isPlayer: false,
    health: 50,
    maxHealth: 50
  };
  
  // Game loop
  let gameLoop: number;
  
  onMount(() => {
    // Initialize game loop
    gameLoop = requestAnimationFrame(update);
    
    return () => {
      cancelAnimationFrame(gameLoop);
    };
  });
  
  function update() {
    // Main game loop update
    gameLoop = requestAnimationFrame(update);
  }
  
  function startBattle() {
    gameState = 'battle';
  }
  
  function endBattle(event: CustomEvent) {
    const { victory, fled } = event.detail;
    
    if (victory) {
      // Handle victory rewards
      console.log('Battle won!');
    } else if (fled) {
      console.log('Successfully fled from battle');
    } else {
      console.log('Battle lost!');
    }
    
    gameState = 'world';
  }
  
  function handleOpenInventory() {
    // Handle opening inventory during battle
    console.log('Opening inventory from battle');
  }
  
  function handleOpenSkills() {
    // Handle opening skills menu during battle
    console.log('Opening skills menu from battle');
  }
</script>

<div class="game-container">
  {#if gameState === 'world'}
    <WorldMap {player} />
  {:else if gameState === 'battle'}
    <Battle 
      playerParty={[player]} 
      enemyParty={[enemy]} 
      on:battleEnd={endBattle}
      on:openInventory={handleOpenInventory}
      on:openSkills={handleOpenSkills}
    />
  {:else if gameState === 'menu'}
    <div class="menu-view">
      <!-- Menu system will go here -->
    </div>
  {/if}
</div>

<style>
  .game-container {
    width: 100%;
    height: 100%;
    background: #000;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
  }
  
  .menu-view {
    width: 100%;
    height: 100%;
    position: relative;
  }
</style> 