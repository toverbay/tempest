<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let showInventory: boolean;
  export let inventory: { [key: string]: { count: number; description: string } };
  export let selectedItemIndex: number;
  export let isMobile: boolean;
  
  const dispatch = createEventDispatcher();
  
  // Convert inventory object to array for easier navigation
  $: inventoryItems = Object.entries(inventory).map(([name, data]) => ({
    name,
    ...data
  }));
  
  function handleItemSelect(index: number) {
    selectedItemIndex = index;
  }
  
  function handleUseItem() {
    if (selectedItemIndex >= 0 && selectedItemIndex < inventoryItems.length) {
      const item = inventoryItems[selectedItemIndex];
      dispatch('useItem', { itemName: item.name });
    }
  }
  
  function handleDropItem() {
    if (selectedItemIndex >= 0 && selectedItemIndex < inventoryItems.length) {
      const item = inventoryItems[selectedItemIndex];
      dispatch('dropItem', { itemName: item.name });
    }
  }
  
  // Handle keyboard events
  function handleKeyDown(event: KeyboardEvent) {
    if (!showInventory) return;
    
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        selectedItemIndex = Math.max(0, selectedItemIndex - 1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        selectedItemIndex = Math.min(inventoryItems.length - 1, selectedItemIndex + 1);
        break;
      case 'Enter':
        handleUseItem();
        break;
      case 'd':
        handleDropItem();
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
</script>

{#if showInventory}
  <div class="inventory-container">
    <div class="inventory-header">
      <h2>Inventory</h2>
      <div class="inventory-controls">
        <button on:click={handleUseItem} disabled={selectedItemIndex < 0}>
          Use (Enter)
        </button>
        <button on:click={handleDropItem} disabled={selectedItemIndex < 0}>
          Drop (D)
        </button>
      </div>
    </div>
    
    <div class="inventory-list">
      {#if inventoryItems.length === 0}
        <div class="empty-inventory">
          Your inventory is empty
        </div>
      {:else}
        {#each inventoryItems as item, index}
          <div
            class="inventory-item"
            class:selected={index === selectedItemIndex}
            on:click={() => handleItemSelect(index)}
          >
            <span class="item-name">{item.name}</span>
            <span class="item-count">x{item.count}</span>
            <div class="item-description">{item.description}</div>
          </div>
        {/each}
      {/if}
    </div>
    
    <div class="inventory-footer">
      <button on:click={() => dispatch('close')}>Close (Esc)</button>
    </div>
  </div>
{/if}

<style>
  .inventory-container {
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
  }
  
  .inventory-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .inventory-controls {
    display: flex;
    gap: 10px;
  }
  
  .inventory-list {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 20px;
  }
  
  .inventory-item {
    padding: 10px;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .inventory-item:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .inventory-item.selected {
    background-color: rgba(33, 150, 243, 0.3);
  }
  
  .item-name {
    font-weight: bold;
    margin-right: 10px;
  }
  
  .item-count {
    color: #aaa;
  }
  
  .item-description {
    font-size: 14px;
    color: #aaa;
    margin-top: 5px;
  }
  
  .empty-inventory {
    text-align: center;
    color: #aaa;
    padding: 20px;
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
    .inventory-container {
      width: 90%;
      max-height: 90vh;
    }
    
    .inventory-controls {
      flex-direction: column;
    }
    
    button {
      width: 100%;
    }
  }
</style> 