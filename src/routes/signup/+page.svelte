<script lang="ts">
  import { API_BASE_URL } from "$lib/config";
  import rssMark from "$lib/assets/rss-mark.svg";
  import showPasswordIcon from "$lib/assets/show-password.svg";
  import continueArrow from "$lib/assets/continue-arrow.svg";
  import AuthEditorialPanel from "$lib/components/AuthEditorialPanel.svelte";

  const MIN_PASSWORD_LENGTH = 8;

  let name = $state<string>("");
  let email = $state<string>("");
  let password = $state<string>("");
  let showPassword = $state<boolean>(false);
  let errorMessage = $state<string>("");
  let successMessage = $state<string>("");
  let isLoading = $state<boolean>(false);

  function validateForm(): boolean {
    errorMessage = "";

    if (!name.trim() || !email.trim() || !password) {
      errorMessage = "Please fill in all fields";
      return false;
    }
    if (name.trim().length < 2) {
      errorMessage = "Name must be at least 2 characters long";
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errorMessage = "Please enter a valid email address";
      return false;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      errorMessage = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
      return false;
    }
    return true;
  }

  async function handleSignup(): Promise<void> {
    if (!validateForm()) return;

    isLoading = true;
    errorMessage = "";
    successMessage = "";

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("Email already exists");
        }
        if (response.status === 400) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || "Invalid input");
        }
        throw new Error(`Signup failed: ${response.status}`);
      }

      const data = await response.json().catch(() => null);
      successMessage =
        data?.message ||
        "Account created! Please check your email for a verification link before logging in.";

      // Clear the form so it's clear the submission went through.
      name = "";
      email = "";
      password = "";
    } catch (error) {
      console.error("Signup failed:", error);
      errorMessage =
        error instanceof Error
          ? error.message
          : "Signup failed. Please try again.";
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="flex min-h-screen bg-[#fcfbf7]">
  <AuthEditorialPanel headline={["Make room for", "what moves you."]} />

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
        <span class="text-[#737c72]">Already have an account?</span>
        <a
          href="/login"
          class="ml-[9px] font-semibold text-[#315d43] hover:underline"
        >
          Log in ↗
        </a>
      </p>
    </div>

    <!-- Registration form (raw elements, same reasoning as the login page:
         the shared ui components' defaults override these styles). -->
    <div class="flex flex-1 items-center justify-center py-12">
      <form
        novalidate
        class="flex w-full max-w-[430px] flex-col gap-[22px]"
        onsubmit={(e) => {
          e.preventDefault();
          handleSignup();
        }}
      >
        <div class="flex flex-col gap-[8px]">
          <h1 class="text-[32px] leading-[1.45] font-semibold text-[#1d3528]">
            Start your next chapter.
          </h1>
          <p class="text-sm leading-[1.45] text-[#737c72]">
            A home for your interests. A little space for you.
          </p>
        </div>

        {#if successMessage}
          <div
            class="rounded-[7px] border border-[#dce6d3] bg-[#eef1e6] px-4 py-3 text-sm text-[#315d43]"
            role="status"
          >
            {successMessage}
          </div>
        {/if}

        <div class="flex flex-col gap-[18px]">
          <div class="flex flex-col gap-[8px]">
            <label
              for="name"
              class="text-xs leading-[1.45] font-medium text-[#34483a]"
            >
              Full name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Your full name"
              bind:value={name}
              disabled={isLoading}
              autocomplete="name"
              class="h-12 w-full rounded-[7px] border border-[#d9ded4] bg-white px-[15px] text-[13px] text-[#34483a] transition-colors placeholder:text-[#879084] focus:border-[#315d43] focus:ring-2 focus:ring-[#315d43]/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

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
                placeholder="Create a password"
                bind:value={password}
                disabled={isLoading}
                autocomplete="new-password"
                aria-describedby="password-hint"
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

          <p
            id="password-hint"
            class="text-[11px] leading-[1.45] text-[#7b8278]"
          >
            Use at least {MIN_PASSWORD_LENGTH} characters.
          </p>
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
          {isLoading ? "Creating account..." : "Create account"}
          {#if !isLoading}
            <img src={continueArrow} alt="" class="h-5 w-5" />
          {/if}
        </button>

        <p class="text-center text-[11px] leading-[1.45] text-[#737c72]">
          By creating an account, you agree to our<br />
          <span class="text-[#315d43]"
            >Terms of Service and Privacy Policy.</span
          >
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
