<script lang="ts">
  import { gameState } from '../stores/gameState';

  const showTimeStamps = false;
  let messageContainer: HTMLDivElement;
  let lastMessageCount = 0;

  // Auto-scroll to bottom when new messages are added
  $effect(() => {
    if ($gameState.messages.length > lastMessageCount && messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }
    lastMessageCount = $gameState.messages.length;
  });
</script>

<div class="message-log" bind:this={messageContainer}>
  {#each $gameState.messages as message}
    <div class="message">
      <span class="message-text">{message.text}</span>
      {#if showTimeStamps}
        <span class="message-time">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .message-log {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 300px;
    max-height: 300px;
    background-color: rgba(0, 0, 0, 0.7);
    border: 2px solid #555;
    border-radius: 8px;
    padding: 10px;
    color: white;
    font-size: 14px;
    display: flex;
    flex-direction: column;

    overflow-y: auto;
    z-index: 5;
    font-family: monospace;
  }

  .message {
    margin-bottom: 5px;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    border-bottom: 1px solid transparent;
    background: linear-gradient(to right, transparent, #555 50%, transparent);
    background-size: 100% 1px;
    background-repeat: no-repeat;
    background-position: bottom;
    text-align: left;
    width: 100%;
  }

  .message-text {
    flex: 1;
    margin-right: 10px;
    line-height: 1;
    padding-bottom: .5em;
    text-align: left;
    display: block;
  }

  .message-time {
    font-size: 0.8em;
    color: #888;
  }

  /* Scrollbar styling */
  .message-log::-webkit-scrollbar {
    width: 8px;
  }

  .message-log::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .message-log::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
  }

  .message-log::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.4);
  }
</style> 