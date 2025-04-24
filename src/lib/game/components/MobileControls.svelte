<script lang="ts">
  const { isMobile, moveInDirection, pickupNearbyItems, showInventory, toggleInventory, showEquipment, toggleEquipment } = $props<{
    isMobile: boolean;
    moveInDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
    pickupNearbyItems: () => void;
    showInventory: boolean;
    toggleInventory: () => void;
    showEquipment: boolean;
    toggleEquipment: () => void;
  }>();
</script>

{#if isMobile}
  <div class="mobile-controls">
    <div class="mobile-buttons">
      <button class="mobile-button" onclick={() => moveInDirection('up')}>⬆️</button>
      <div class="horizontal-buttons">
        <button class="mobile-button" onclick={() => moveInDirection('left')}>⬅️</button>
        <button class="mobile-button" onclick={() => moveInDirection('right')}>➡️</button>
      </div>
      <button class="mobile-button" onclick={() => moveInDirection('down')}>⬇️</button>
    </div>
    <div class="action-buttons">
      <button class="action-button" onclick={pickupNearbyItems}>🔍 Pick Up</button>
      <button class="action-button" onclick={toggleInventory}>🎒 Inventory</button>
      <button class="action-button" onclick={toggleEquipment}>⚔️ Equipment</button>
    </div>
  </div>
{/if}

<style>
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
</style> 