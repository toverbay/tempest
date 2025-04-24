<script lang="ts">
  import { gameState } from '../stores/gameState';
  import { createEventDispatcher } from 'svelte';
  import type { Item, EquipmentHand, Inventory } from '../types';
  
  // Using $props rune instead of export let
  const { showEquipment, equipment, selectedHand, isMobile, inventory } = $props<{
    showEquipment: boolean;
    equipment: {
      mainHand: string | null;
      offHand: string | null;
    };
    selectedHand: 'mainHand' | 'offHand' | null;
    isMobile: boolean;
    inventory: Inventory;
  }>();
  
  // Using $state rune for local state
  let localSelectedHand = $state(selectedHand);
  let localEquipment = $state(equipment);
  
  const dispatch = createEventDispatcher();
  
  // Create an item based on its ID
  function createItem(id: string) {
    switch (id) {
      case 'health_potion':
        return { id, name: 'Health Potion', count: 1, description: 'Restores 30 HP', sprite: '🧪' };
      case 'strength_potion':
        return { id, name: 'Strength Potion', count: 1, description: 'Increases attack damage by 50% for 3 turns', sprite: '💪' };
      case 'torch':
        return { id, name: 'Torch', count: 1, description: 'Lights up the area around you', sprite: '🔥', preferredHand: 'offHand' as 'mainHand' | 'offHand' };
      case 'axe':
        return { id, name: 'Axe', count: 1, description: 'Used to chop down trees', sprite: '🪓', preferredHand: 'mainHand' as 'mainHand' | 'offHand' };
      default:
        return null;
    }
  }
  
  // Equip an item in the specified hand
  function equipItem(itemId: string, hand: 'mainHand' | 'offHand') {
    // First, unequip any item in the target hand
    if (localEquipment[hand]) {
      const currentItemId = localEquipment[hand];
      // Add the current item back to inventory
      const existingItem = inventory.items.find((i: Item) => i.id === currentItemId);
      if (existingItem) {
        existingItem.count++;
      } else {
        // Create a new item entry
        const newItem = createItem(currentItemId);
        if (newItem) {
          inventory.items.push(newItem);
        }
      }
      dispatch('message', { text: `You unequipped the ${currentItemId.replace('_', ' ')} from your ${hand === 'mainHand' ? 'main' : 'off'} hand.` });
    }
    
    // Now equip the new item
    localEquipment[hand] = itemId;
    dispatch('message', { text: `You equipped the ${itemId.replace('_', ' ')} in your ${hand === 'mainHand' ? 'main' : 'off'} hand.` });
    
    // Update fog of war based on torch equipment
    updateFogOfWarBasedOnTorch();
    
    // Notify parent of equipment change
    dispatch('equipmentChange', { equipment: localEquipment });
  }
  
  // Function to check if a torch is equipped
  function hasTorchEquipped(): boolean {
    return localEquipment.mainHand === 'torch' || localEquipment.offHand === 'torch';
  }
  
  // Function to update fog of war based on torch equipment
  function updateFogOfWarBasedOnTorch() {
    const shouldBeEnabled = hasTorchEquipped();
    dispatch('fogOfWarChange', { enabled: shouldBeEnabled });
  }
  
  function handleHandSelect(hand: 'mainHand' | 'offHand') {
    localSelectedHand = hand;
  }
  
  function handleUnequip() {
    if (localSelectedHand && localEquipment[localSelectedHand]) {
      const itemId = localEquipment[localSelectedHand];
      // Add the item back to inventory
      const existingItem = inventory.items.find((i: Item) => i.id === itemId);
      if (existingItem) {
        existingItem.count++;
      } else {
        // Create a new item entry
        const newItem = createItem(itemId);
        if (newItem) {
          inventory.items.push(newItem);
        }
      }
      localEquipment[localSelectedHand] = null;
      dispatch('message', { text: `You unequipped the ${itemId.replace('_', ' ')} from your ${localSelectedHand === 'mainHand' ? 'main' : 'off'} hand.` });
      
      // Update fog of war based on torch equipment
      updateFogOfWarBasedOnTorch();
      
      // Notify parent of equipment change
      dispatch('equipmentChange', { equipment: localEquipment });
    }
  }
  
  function handleSwap() {
    if (localEquipment.mainHand || localEquipment.offHand) {
      const mainHandItem = localEquipment.mainHand;
      const offHandItem = localEquipment.offHand;
      
      localEquipment.mainHand = offHandItem;
      localEquipment.offHand = mainHandItem;
      
      if (mainHandItem && offHandItem) {
        dispatch('message', { text: `You swapped the ${mainHandItem.replace('_', ' ')} and ${offHandItem.replace('_', ' ')}.` });
      } else if (mainHandItem) {
        dispatch('message', { text: `You moved the ${mainHandItem.replace('_', ' ')} to your off hand.` });
      } else if (offHandItem) {
        dispatch('message', { text: `You moved the ${offHandItem.replace('_', ' ')} to your main hand.` });
      } else {
        dispatch('message', { text: "You have nothing to swap." });
      }
      
      // Update fog of war based on torch equipment
      updateFogOfWarBasedOnTorch();
      
      // Notify parent of equipment change
      dispatch('equipmentChange', { equipment: localEquipment });
    }
  }
  
  // Handle keyboard events
  function handleKeyDown(event: KeyboardEvent) {
    if (!showEquipment) return;
    
    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        localSelectedHand = localSelectedHand === 'mainHand' ? 'offHand' : 'mainHand';
        break;
      case 'u':
        handleUnequip();
        break;
      case 's':
        handleSwap();
        break;
      case 'Escape':
        dispatch('close');
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

  // Handle equipment changes
  function handleEquipmentChange(event: CustomEvent<{ type: 'equip' | 'unequip'; item?: Item; hand: EquipmentHand }>) {
    const { type, item, hand } = event.detail;
    
    if (type === 'equip' && item) {
      gameState.equipItem(item, hand);
      dispatch('equipmentChange', { type, item, hand });
    } else if (type === 'unequip') {
      // Remove item from equipment and add to inventory
      const equippedItem = $gameState.equipment[hand];
      if (equippedItem) {
        gameState.unequipItem(hand);
        gameState.addToInventory(equippedItem);
        dispatch('equipmentChange', { type, hand });
      }
    }
  }

  // Handle item usage
  function handleUseItem(event: CustomEvent<{ item: Item }>) {
    const { item } = event.detail;
    // Remove item from inventory and apply its effects
    gameState.removeFromInventory(item.id);
    dispatch('itemUsed', { item });
  }
</script>

{#if showEquipment}
  <div class="equipment-container">
    <div class="equipment-header">
      <h2>Equipment</h2>
      <div class="equipment-controls">
        <button onclick={handleUnequip} disabled={!localSelectedHand || !localEquipment[localSelectedHand]}>
          Unequip (U)
        </button>
        <button onclick={handleSwap} disabled={!localEquipment.mainHand && !localEquipment.offHand}>
          Swap Hands (S)
        </button>
      </div>
    </div>
    
    <div class="equipment-slots">
      <div
        class="equipment-slot main-hand"
        class:selected={localSelectedHand === 'mainHand'}
        onclick={() => handleHandSelect('mainHand')}
        onkeydown={(e) => e.key === 'Enter' && handleHandSelect('mainHand')}
        role="button"
        tabindex="0"
      >
        <h3>Main Hand</h3>
        {#if localEquipment.mainHand}
          <div class="equipped-item">
            <span class="item-emoji">{createItem(localEquipment.mainHand)?.sprite || ''}</span>
            <span class="item-name">{createItem(localEquipment.mainHand)?.name || localEquipment.mainHand}</span>
            <span class="item-description">{createItem(localEquipment.mainHand)?.description || ''}</span>
          </div>
        {:else}
          <div class="empty-slot">Empty</div>
        {/if}
      </div>
      
      <div
        class="equipment-slot off-hand"
        class:selected={localSelectedHand === 'offHand'}
        onclick={() => handleHandSelect('offHand')}
        onkeydown={(e) => e.key === 'Enter' && handleHandSelect('offHand')}
        role="button"
        tabindex="0"
      >
        <h3>Off Hand</h3>
        {#if localEquipment.offHand}
          <div class="equipped-item">
            <span class="item-emoji">{createItem(localEquipment.offHand)?.sprite || ''}</span>
            <span class="item-name">{createItem(localEquipment.offHand)?.name || localEquipment.offHand}</span>
            <span class="item-description">{createItem(localEquipment.offHand)?.description || ''}</span>
          </div>
        {:else}
          <div class="empty-slot">Empty</div>
        {/if}
      </div>
    </div>
    
    <div class="equipment-footer">
      <button onclick={() => dispatch('close')}>Close (Esc)</button>
    </div>
  </div>
{/if}

<style>
  .equipment-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.9);
    padding: 20px;
    border-radius: 10px;
    color: white;
    min-width: 300px;
    max-width: 500px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    z-index: 100; /* Increased to be above the character */
  }
  
  .equipment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .equipment-controls {
    display: flex;
    gap: 10px;
  }
  
  .equipment-slots {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 20px;
  }
  
  .equipment-slot {
    padding: 15px;
    border-radius: 5px;
    background-color: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .equipment-slot:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
  
  .equipment-slot.selected {
    background-color: rgba(33, 150, 243, 0.3);
    border: 2px solid #2196F3;
  }
  
  .equipment-slot h3 {
    margin: 0 0 10px 0;
    font-size: 16px;
    color: #aaa;
  }
  
  .equipped-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }
  
  .item-emoji {
    font-size: 24px;
  }
  
  .item-name {
    font-weight: bold;
  }
  
  .item-description {
    font-size: 12px;
    color: #aaa;
    text-align: center;
  }
  
  .empty-slot {
    color: #666;
    font-style: italic;
  }
  
  button {
    padding: 8px 16px;
    border: none;
    border-radius: 5px;
    background-color: #2196F3;
    color: white;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  button:hover:not(:disabled) {
    background-color: #1976D2;
  }
  
  button:disabled {
    background-color: #666;
    cursor: not-allowed;
  }
  
  /* Mobile Responsive Styles */
  @media (max-width: 768px) {
    .equipment-container {
      width: 90%;
      max-height: 90vh;
    }
    
    .equipment-controls {
      flex-direction: column;
    }
    
    button {
      width: 100%;
    }
  }
</style> 