<script lang="ts">
  import { goto } from "$app/navigation";
  import { API_BASE_URL } from "$lib/config";
  import rssMark from "$lib/assets/rss-mark.svg";
  import showPasswordIcon from "$lib/assets/show-password.svg";
  import continueArrow from "$lib/assets/continue-arrow.svg";
  import AuthEditorialPanel from "$lib/components/AuthEditorialPanel.svelte";

  let email = $state<string>("");
  let password = $state<string>("");
  let errorMessage = $state<string>("");
  let isLoading = $state<boolean>(false);
  let showPassword = $state<boolean>(false);

  async function handleLogin(): Promise<void> {
    if (!email.trim() || !password.trim()) {
      errorMessage = "Please enter both email and password";
      return;
    }

    isLoading = true;
    errorMessage = "";

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid email or password");
        }
        if (response.status === 403) {
          throw new Error("Forbidden");
        }
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();

      // Store JWT token in localStorage
      if (data.token) {
        localStorage.setItem("jwt_token", data.token);

        // Optionally store user info if returned
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        // Redirect to default route (home page)
        goto("/");
      } else {
        throw new Error("No token received from server");
      }
    } catch (error) {
      console.error("Login failed:", error);
      errorMessage =
        error instanceof Error
          ? error.message
          : "Login failed. Please try again.";
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="flex min-h-screen bg-[#fcfbf7]">
  <AuthEditorialPanel headline={["Your world.", "Worth reading."]} />

  <!-- Right · Authentication -->
  <div
    class="flex min-h-screen w-full flex-col px-8 pt-[58px] pb-[37px] lg:w-[55%] lg:px-16"
  >
    <!-- Mobile brand + account switch -->
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div class="flex items-center gap-3 lg:hidden">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#dce9b9] p-1.5"
        >
          <img src={rssMark} alt="feedit.live" class="h-6 w-6" />
        </div>
        <p class="text-2xl font-semibold text-[#17362b]">feedit.live</p>
      </div>
      <p class="ml-auto text-xs leading-[1.45]">
        <span class="text-[#737c72]">New to feedit.live?</span>
        <a
          href="/signup"
          class="ml-2 font-semibold text-[#315d43] hover:underline"
        >
          Create an account ↗
        </a>
      </p>
    </div>

    <!-- Login form

         Raw <input>/<button> elements are used here instead of the shared ui
         components: their baked-in blue defaults override per-page classes due
         to Tailwind v4 CSS ordering, so they cannot express this design
         reliably without touching every page that uses them. -->
    <div class="flex flex-1 items-center justify-center py-12">
      <form
        novalidate
        class="flex w-full max-w-[430px] flex-col gap-[22px]"
        onsubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
      >
        <div class="flex flex-col gap-[8px]">
          <h1 class="text-[32px] leading-[1.45] font-semibold text-[#1d3528]">
            Welcome back.
          </h1>
          <p class="text-sm leading-[1.45] text-[#737c72]">
            Your favorite reads are right where you left them.
          </p>
        </div>

        <div class="flex flex-col gap-[18px]">
          <div class="flex flex-col gap-[8px]">
            <label
              for="email"
              class="text-xs leading-[1.45] font-medium text-[#34483a]"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              bind:value={email}
              disabled={isLoading}
              autocomplete="email"
              class="h-12 w-full rounded-[7px] border border-[#d9ded4] bg-white px-[15px] text-[13px] text-[#34483a] transition-colors placeholder:text-[#879084] focus:border-[#315d43] focus:ring-2 focus:ring-[#315d43]/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div class="flex flex-col gap-[8px]">
            <label
              for="password"
              class="text-xs leading-[1.45] font-medium text-[#34483a]"
            >
              Password
            </label>
            <div class="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                bind:value={password}
                disabled={isLoading}
                autocomplete="current-password"
                class="h-12 w-full rounded-[7px] border border-[#d9ded4] bg-white px-[15px] pr-12 text-[13px] text-[#34483a] transition-colors placeholder:text-[#879084] focus:border-[#315d43] focus:ring-2 focus:ring-[#315d43]/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onclick={() => (showPassword = !showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                class="absolute top-1/2 right-4 -translate-y-1/2 rounded p-0.5 focus:ring-2 focus:ring-[#315d43]/50 focus:outline-none"
              >
                <img src={showPasswordIcon} alt="" class="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Remember me is visual only for now — not yet wired to auth
             (local vs session storage). Forgot password is out of scope. -->
        <div class="flex items-center gap-2">
          <input
            id="remember"
            type="checkbox"
            class="h-4 w-4 rounded-[3px] accent-[#315d43]"
          />
          <label
            for="remember"
            class="flex-1 text-xs leading-[1.45] text-[#677461]"
          >
            Remember me
          </label>
        </div>

        {#if errorMessage}
          <div
            class="rounded-[7px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {errorMessage}
          </div>
        {/if}

        <button
          type="submit"
          disabled={isLoading}
          class="flex h-[50px] w-full items-center justify-center gap-3 rounded-[7px] bg-[#315d43] text-sm font-semibold text-white transition-colors hover:bg-[#2a4d39] focus:ring-2 focus:ring-[#315d43]/50 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Signing in..." : "Log in"}
          {#if !isLoading}
            <img src={continueArrow} alt="" class="h-5 w-5" />
          {/if}
        </button>

        <p class="text-center text-[11px] leading-[1.45] text-[#7b8278]">
          Pick up where your curiosity left off.
        </p>
      </form>
    </div>

    <!-- Footer -->
    <div class="flex items-start gap-[22px] text-[11px] leading-[1.45]">
      <p class="flex-1 text-[#7b8278]">© 2026 feedit.live</p>
      <p class="text-[#737c72]">Privacy</p>
      <p class="text-[#737c72]">Terms</p>
      <p class="text-[#737c72]">Get help</p>
    </div>
  </div>
</div>
