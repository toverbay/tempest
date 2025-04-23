<script lang="ts">
  import type { Character } from './types/Character';
  
  export let playerParty: Character[] = [];
  export let enemyParty: Character[] = [];
  
  let currentTurn = 0;
  let battleState: 'player' | 'enemy' | 'animation' = 'player';
  let selectedAction: 'attack' | 'skill' | 'item' | 'defend' | null = null;
  
  function handleAction(action: 'attack' | 'skill' | 'item' | 'defend') {
    selectedAction = action;
    // Implement action logic here
  }
  
  function calculateDamage(attacker: Character, defender: Character): number {
    const baseDamage = attacker.stats.strength - defender.stats.defense;
    return Math.max(1, baseDamage);
  }
</script>

<div class="battle-container">
  <div class="battle-field">
    <div class="player-party">
      {#each playerParty as character}
        <div class="character player-character">
          <div class="character-sprite"></div>
          <div class="character-stats">
            <div class="hp-bar">
              <div class="hp-fill" style="width: {(character.stats.hp / character.stats.maxHp) * 100}%"></div>
            </div>
            <div class="mp-bar">
              <div class="mp-fill" style="width: {(character.stats.mp / character.stats.maxMp) * 100}%"></div>
            </div>
          </div>
        </div>
      {/each}
    </div>
    
    <div class="enemy-party">
      {#each enemyParty as enemy}
        <div class="character enemy-character">
          <div class="character-sprite"></div>
          <div class="character-stats">
            <div class="hp-bar">
              <div class="hp-fill" style="width: {(enemy.stats.hp / enemy.stats.maxHp) * 100}%"></div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
  
  <div class="battle-menu">
    <button on:click={() => handleAction('attack')}>Attack</button>
    <button on:click={() => handleAction('skill')}>Skills</button>
    <button on:click={() => handleAction('item')}>Items</button>
    <button on:click={() => handleAction('defend')}>Defend</button>
  </div>
</div>

<style>
  .battle-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #000;
    color: #fff;
    justify-content: center;
    align-items: center;
  }
  
  .battle-field {
    display: flex;
    justify-content: space-between;
    padding: 2rem;
    width: 80%;
    max-width: 800px;
  }
  
  .player-party, .enemy-party {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .character {
    width: 100px;
    height: 100px;
    border: 2px solid #fff;
    position: relative;
  }
  
  .character-stats {
    position: absolute;
    bottom: -20px;
    left: 0;
    width: 100%;
  }
  
  .hp-bar, .mp-bar {
    width: 100%;
    height: 4px;
    background: #333;
    margin: 2px 0;
  }
  
  .hp-fill {
    height: 100%;
    background: #ff0000;
  }
  
  .mp-fill {
    height: 100%;
    background: #0000ff;
  }
  
  .battle-menu {
    height: 100px;
    display: flex;
    justify-content: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.8);
    width: 80%;
    max-width: 800px;
  }
  
  button {
    padding: 0.5rem 1rem;
    background: #333;
    color: #fff;
    border: 2px solid #fff;
    cursor: pointer;
    font-family: inherit;
  }
  
  button:hover {
    background: #444;
  }
</style> 