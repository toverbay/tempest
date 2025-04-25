<script lang="ts">
  import GameEngine from './lib/game/GameEngine.svelte';
</script>

<GameEngine />

<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap');
  /* @import url('https://fonts.googleapis.com/css2?family=Noto+Emoji:wght@300..700&display=swap'); */

  :global(body) {
    margin: 0;
    padding: 0;
    background: #000;
    color: #fff;
    font-family: 'Press Start 2P', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  :global(html) {
    overflow: hidden;
  }

</style>
