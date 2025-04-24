<script lang="ts">
  // Using $props rune instead of export let
  const { gameTick, playerHealth, playerMaxHealth, gold, wood, isPlayerDefeated, monstersHostile } = $props<{
    gameTick: number;
    playerHealth: number;
    playerMaxHealth: number;
    gold: number;
    wood: number;
    isPlayerDefeated: boolean;
    monstersHostile: boolean;
  }>();
</script>

<div class="game-info">
  <p>⏱️ Game Tick: {gameTick}</p>
  <p>❤️ Player HP: {playerHealth}/{playerMaxHealth}</p>
  <p>💰 Gold: {gold}</p>
  <p>🪵 Wood: {wood}</p>
  <p>⌨️ Controls: Arrow keys to move, A/D/I for battle actions, TAB for inventory</p>
  <p>🔍 Press P to pick up items near you</p>
  <p>🪓 Press C to chop nearby trees</p>
  <p>👾 Press H to toggle monster hostility: {monstersHostile ? "Hostile" : "Passive"}</p>
  {#if isPlayerDefeated}
    <p class="defeated-message">💀 You are defeated! Use a Health Potion to revive.</p>
  {/if}
</div>

<style>
  .game-info {
    position: absolute;
    top: 10px;
    left: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 14px;
    max-width: 250px;
    z-index: 5;
  }
  
  .defeated-message {
    color: #ff5555;
    font-weight: bold;
    margin-top: 5px;
  }
  
  /* Mobile Responsive Styles */
  @media (max-width: 768px) {
    .game-info {
      position: relative;
      width: 100%;
      max-width: none;
      margin-top: 10px;
    }
  }
</style> 