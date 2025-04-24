<script lang="ts">
  // Using $props rune instead of export let
  const { mapData, tileEmojis, TILE_SIZE, fogOfWarEnabled, visibleTiles, discoveredTiles, rememberDiscoveredTiles } = $props<{
    mapData: {
      width: number;
      height: number;
      tiles: number[][];
    };
    tileEmojis: { [key: number]: string };
    TILE_SIZE: number;
    fogOfWarEnabled: boolean;
    visibleTiles: boolean[][];
    discoveredTiles: boolean[][];
    rememberDiscoveredTiles: boolean;
  }>();
  
  // Function to check if a tile is visible
  function isTileVisible(x: number, y: number): boolean {
    if (!fogOfWarEnabled) return false; // Always return false when fog of war is disabled
    
    // If remember discovered tiles is enabled, show discovered tiles
    if (rememberDiscoveredTiles && discoveredTiles[y][x]) {
      return true;
    }
    
    return visibleTiles[y][x];
  }
</script>

<div class="tile-grid">
  {#each mapData.tiles as row, y (y)}
    {#each row as tile, x (x)}
      <div 
        class="tile" 
        class:fog-hidden={fogOfWarEnabled && !isTileVisible(x, y)}
        style="left: {x * TILE_SIZE}px; top: {y * TILE_SIZE}px;"
      >
        <span class="tile-emoji">{tileEmojis[tile]}</span>
      </div>
    {/each}
  {/each}
</div>

<style>
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
  
  /* Mobile Responsive Styles */
  @media (max-width: 768px) {
    .tile {
      width: calc(100% / 20);
      height: calc(100% / 15);
    }
    
    .tile-emoji {
      font-size: clamp(16px, 4vw, 28px);
    }
  }
</style> 