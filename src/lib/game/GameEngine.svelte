<script lang="ts">
  import { onMount } from 'svelte';
  import WorldMap from './WorldMap.svelte';
  import BattleSystem from './BattleSystem.svelte';
  import type { Character, PlayerCharacter } from './types/Character';
  
  // Game state
  let gameState: 'world' | 'battle' | 'menu' = 'world';
  
  // Player character
  const player: PlayerCharacter = {
    id: 'player1',
    name: 'Hero',
    level: 1,
    stats: {
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      strength: 15,
      defense: 10,
      magic: 8,
      speed: 12
    },
    position: { x: 160, y: 160 },
    sprite: 'player',
    isPlayer: true,
    inventory: [],
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
    stats: {
      hp: 50,
      maxHp: 50,
      mp: 0,
      maxMp: 0,
      strength: 8,
      defense: 5,
      magic: 0,
      speed: 6
    },
    position: { x: 0, y: 0 },
    sprite: 'slime',
    isPlayer: false
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
  
  function endBattle() {
    gameState = 'world';
  }
</script>

<div class="game-container">
  {#if gameState === 'world'}
    <WorldMap {player} />
  {:else if gameState === 'battle'}
    <BattleSystem 
      playerParty={[player]} 
      enemyParty={[enemy]} 
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