<script lang="ts">
  import type { Combatant } from '../types/';
  import { createEventDispatcher } from 'svelte';
  
  // Using $props rune instead of export let
  const { playerParty, enemyParty } = $props<{
    playerParty: Combatant[];
    enemyParty: Combatant[];
  }>();
  
  // Using $state rune for local state
  let currentTurn = $state(0);
  let battleState = $state<'player' | 'enemy' | 'animation'>('player');
  let selectedAction = $state<'attack' | 'skill' | 'item' | 'defend' | null>(null);
  let battleMessages = $state<{ text: string, timestamp: number }[]>([]);
  
  const dispatch = createEventDispatcher();
  
  // Add a message to the battle log
  function addBattleMessage(text: string) {
    battleMessages = [...battleMessages, { text, timestamp: Date.now() }];
  }
  
  // Handle player actions
  function handleAction(action: 'attack' | 'skill' | 'item' | 'defend') {
    selectedAction = action;
    
    if (action === 'attack') {
      // Simple attack logic
      const player = playerParty[0];
      const enemy = enemyParty[0];
      
      if (player && enemy) {
        const damage = calculateDamage(player, enemy);
        enemy.stats.hp = Math.max(0, enemy.stats.hp - damage);
        addBattleMessage(`${player.name} attacks ${enemy.name} for ${damage} damage!`);
        
        // Check if enemy is defeated
        if (enemy.stats.hp <= 0) {
          addBattleMessage(`${enemy.name} is defeated!`);
          setTimeout(() => {
            dispatch('battleEnd', { victory: true });
          }, 1500);
        } else {
          // Enemy turn
          setTimeout(() => {
            enemyTurn();
          }, 1000);
        }
      }
    } else if (action === 'defend') {
      const player = playerParty[0];
      if (player) {
        addBattleMessage(`${player.name} takes a defensive stance!`);
        // Implement defense logic here
        setTimeout(() => {
          enemyTurn();
        }, 1000);
      }
    } else if (action === 'item') {
      // Open inventory for item selection
      dispatch('openInventory');
    } else if (action === 'skill') {
      // Open skill menu
      dispatch('openSkills');
    }
  }
  
  // Enemy turn logic
  function enemyTurn() {
    battleState = 'enemy';
    const enemy = enemyParty[0];
    const player = playerParty[0];
    
    if (enemy && player) {
      const damage = calculateDamage(enemy, player);
      player.stats.hp = Math.max(0, player.stats.hp - damage);
      addBattleMessage(`${enemy.name} attacks ${player.name} for ${damage} damage!`);
      
      // Check if player is defeated
      if (player.stats.hp <= 0) {
        addBattleMessage(`${player.name} is defeated!`);
        setTimeout(() => {
          dispatch('battleEnd', { victory: false });
        }, 1500);
      } else {
        // Back to player turn
        setTimeout(() => {
          battleState = 'player';
        }, 1000);
      }
    }
  }
  
  // Calculate damage based on attacker and defender stats
  function calculateDamage(attacker: Combatant, defender: Combatant): number {
    const baseDamage = attacker.stats.strength - defender.stats.defense;
    return Math.max(1, baseDamage);
  }
  
  // Handle fleeing from battle
  function handleFlee() {
    const fleeChance = 0.5; // 50% chance to flee
    if (Math.random() < fleeChance) {
      addBattleMessage("You successfully fled from battle!");
      setTimeout(() => {
        dispatch('battleEnd', { victory: false, fled: true });
      }, 1000);
    } else {
      addBattleMessage("You failed to flee!");
      setTimeout(() => {
        enemyTurn();
      }, 1000);
    }
  }
  
  // Handle keyboard events
  function handleKeyDown(event: KeyboardEvent) {
    if (battleState !== 'player') return;
    
    switch (event.key.toLowerCase()) {
      case 'a':
        handleAction('attack');
        break;
      case 'd':
        handleAction('defend');
        break;
      case 'i':
        handleAction('item');
        break;
      case 's':
        handleAction('skill');
        break;
      case 'escape':
        handleFlee();
        break;
    }
  }
  
  // Lifecycle
  import { onMount } from 'svelte';
  
  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });
</script>

<div class="battle-container">
  <!-- Battle field with characters -->
  <div class="battle-field">
    <div class="player-party">
      {#each playerParty as character}
        <div class="character player-character">
          <div class="character-sprite">{character.sprite}</div>
          <div class="character-stats">
            <div class="hp-bar">
              <div class="hp-fill" style="width: {(character.stats.hp / character.stats.maxHp) * 100}%"></div>
            </div>
            <div class="mp-bar">
              <div class="mp-fill" style="width: {(character.stats.mp / character.stats.maxMp) * 100}%"></div>
            </div>
            <div class="character-info">
              <span class="character-name">{character.name}</span>
              <span class="character-hp">HP: {character.stats.hp}/{character.stats.maxHp}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
    
    <div class="enemy-party">
      {#each enemyParty as enemy}
        <div class="character enemy-character">
          <div class="character-sprite">{enemy.sprite}</div>
          <div class="character-stats">
            <div class="hp-bar">
              <div class="hp-fill" style="width: {(enemy.stats.hp / enemy.stats.maxHp) * 100}%"></div>
            </div>
            <div class="character-info">
              <span class="character-name">{enemy.name}</span>
              <span class="character-hp">HP: {enemy.stats.hp}/{enemy.stats.maxHp}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
  
  <!-- Battle menu -->
  <div class="battle-menu">
    <div class="battle-actions">
      <button class="action-option" onclick={() => handleAction('attack')}>⚔️ Attack (A)</button>
      <button class="action-option" onclick={() => handleAction('defend')}>🛡️ Defend (D)</button>
      <button class="action-option" onclick={() => handleAction('skill')}>✨ Skills (S)</button>
      <button class="action-option" onclick={() => handleAction('item')}>🎒 Items (I)</button>
      <button class="action-option" onclick={handleFlee}>🏃 Flee (ESC)</button>
    </div>
    
    <div class="battle-instructions">
      <p>Press A to Attack, D to Defend, S for Skills, I for Items, or ESC to try to flee</p>
    </div>
  </div>
  
  <!-- Battle log -->
  <div class="battle-log">
    {#each battleMessages.slice(-5) as message}
      <div class="battle-message">{message.text}</div>
    {/each}
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
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    position: relative;
    z-index: 100;
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
    width: 120px;
    height: 120px;
    border: 2px solid #fff;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 8px;
  }
  
  .character-sprite {
    font-size: 48px;
    margin-bottom: 10px;
  }
  
  .character-stats {
    position: absolute;
    bottom: -30px;
    left: 0;
    width: 100%;
  }
  
  .character-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 5px;
    font-size: 12px;
  }
  
  .character-name {
    font-weight: bold;
  }
  
  .hp-bar, .mp-bar {
    width: 100%;
    height: 6px;
    background: #333;
    margin: 2px 0;
    border-radius: 3px;
    overflow: hidden;
  }
  
  .hp-fill {
    height: 100%;
    background: #4CAF50;
    transition: width 0.3s ease;
  }
  
  .mp-fill {
    height: 100%;
    background: #2196F3;
    transition: width 0.3s ease;
  }
  
  .battle-menu {
    width: 80%;
    max-width: 800px;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #555;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;
  }
  
  .battle-actions {
    display: flex;
    justify-content: space-around;
    margin-bottom: 10px;
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .action-option {
    padding: 8px 16px;
    background-color: #2196F3;
    color: white;
    border-radius: 4px;
    font-weight: bold;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .action-option:hover {
    background-color: #1976D2;
  }
  
  .battle-instructions {
    margin-top: 10px;
    text-align: center;
    font-size: 14px;
    color: #aaa;
  }
  
  .battle-log {
    width: 80%;
    max-width: 800px;
    max-height: 150px;
    background: rgba(0, 0, 0, 0.7);
    border: 2px solid #555;
    border-radius: 8px;
    padding: 10px;
    overflow-y: auto;
    margin-top: 20px;
  }
  
  .battle-message {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .battle-message:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
  
  /* Mobile Responsive Styles */
  @media (max-width: 768px) {
    .battle-field {
      flex-direction: column;
      align-items: center;
      gap: 40px;
    }
    
    .battle-actions {
      flex-direction: column;
    }
    
    .action-option {
      width: 100%;
    }
  }
</style> 