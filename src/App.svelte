<script lang="ts">
  import GameEngine from './lib/game/GameEngine.svelte';
</script>

<main>
  <GameEngine />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #000;
    color: #fff;
    font-family: 'Press Start 2P', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    overflow: hidden;
  }

  :global(html) {
    overflow: hidden;
  }

  main {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }
</style>
