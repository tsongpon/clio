<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Button from "$lib/components/ui/button/Button.svelte";
  import { removeToken } from "$lib/utils/auth";

  let countdown = 10;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    // Start countdown timer
    intervalId = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        handleReLogin();
      }
    }, 1000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  });

  function handleReLogin() {
    if (intervalId) clearInterval(intervalId);
    // Clear authentication token
    removeToken();
    // Navigate to login page
    goto("/login");
  }

  function handleRefresh() {
    if (intervalId) clearInterval(intervalId);
    window.location.reload();
  }
</script>

<div class="error-container">
  <div class="error-card">
    <div class="error-icon">
      <svg
        width="80"
        height="80"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    </div>

    <h1 class="error-title">Oops! Something went wrong</h1>

    <p class="error-message">
      We're experiencing technical difficulties. This could be a server issue,
      network problem, or connectivity error.
    </p>

    <div class="error-suggestion">
      <p class="suggestion-text">
        To resolve this issue, we recommend logging in again. This will refresh
        your session and may help restore the connection.
      </p>
    </div>

    <div class="countdown-text">
      Automatically redirecting to login in <span class="countdown-number"
        >{countdown}</span
      > seconds...
    </div>

    <div class="button-group">
      <Button on:click={handleReLogin} variant="default">
        {#snippet children()}
          <span class="button-text">Re-login Now</span>
        {/snippet}
      </Button>
      <Button on:click={handleRefresh} variant="ghost">
        {#snippet children()}
          <span class="button-text">Try Again</span>
        {/snippet}
      </Button>
    </div>

    <div class="help-text">
      <p>Still having issues? Please try:</p>
      <ul>
        <li>Clearing your browser cache</li>
        <li>Using a different browser</li>
        <li>Checking your internet connection</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .error-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .error-card {
    background: white;
    border-radius: 1rem;
    padding: 3rem 2rem;
    max-width: 32rem;
    width: 100%;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    text-align: center;
    animation: slideUp 0.5s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(2rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .error-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
    color: #ef4444;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .error-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .error-message {
    font-size: 1.125rem;
    color: #6b7280;
    margin-bottom: 1.5rem;
    line-height: 1.6;
  }

  .error-suggestion {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .suggestion-text {
    color: #92400e;
    font-size: 0.95rem;
    margin: 0;
    text-align: left;
    line-height: 1.5;
  }

  .countdown-text {
    font-size: 0.95rem;
    color: #6b7280;
    margin-bottom: 1.5rem;
  }

  .countdown-number {
    font-weight: 700;
    color: #667eea;
    font-size: 1.1rem;
  }

  .button-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 2rem;
  }

  .button-text {
    font-size: 1rem;
    font-weight: 600;
  }

  .help-text {
    border-top: 1px solid #e5e7eb;
    padding-top: 1.5rem;
    text-align: left;
  }

  .help-text p {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }

  .help-text ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .help-text li {
    font-size: 0.875rem;
    color: #6b7280;
    padding: 0.25rem 0;
    padding-left: 1.25rem;
    position: relative;
  }

  .help-text li::before {
    content: "•";
    position: absolute;
    left: 0.5rem;
    color: #667eea;
    font-weight: bold;
  }

  @media (min-width: 640px) {
    .button-group {
      flex-direction: row;
      justify-content: center;
    }
  }
</style>
