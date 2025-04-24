<script lang="ts">
  import type { Character } from '../types/';
  
  const { player } = $props<{ player: Character }>();
</script>

<div class="player-character" style="left: {player.position.x}px; top: {player.position.y}px;">
  {player.sprite}
</div>

<style>
  .player-character {
    position: absolute;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    z-index: 1;
    pointer-events: none;
  }
</style> 