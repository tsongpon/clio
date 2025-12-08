<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Button from "$lib/components/ui/button/Button.svelte";
  import { removeToken } from "$lib/utils/auth";

  let countdown = 10;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
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
    removeToken();
    goto("/login");
  }

  function handleRefresh() {
    if (intervalId) clearInterval(intervalId);
    window.location.reload();
  }
</script>

<div class="error-container">
  <div class="error-card">
    <h1 class="error-title">Something went wrong</h1>

    <p class="error-message">
      Redirecting to login in {countdown} seconds
    </p>

    <div class="button-group">
      <Button on:click={handleReLogin} variant="default">
        {#snippet children()}
          Login Now
        {/snippet}
      </Button>
      <Button on:click={handleRefresh} variant="ghost">
        {#snippet children()}
          Try Again
        {/snippet}
      </Button>
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
  }

  .error-card {
    max-width: 28rem;
    width: 100%;
    text-align: center;
  }

  .error-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .error-message {
    color: #6b7280;
    margin-bottom: 2rem;
  }

  .button-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  @media (min-width: 640px) {
    .button-group {
      flex-direction: row;
      justify-content: center;
    }
  }
</style>
