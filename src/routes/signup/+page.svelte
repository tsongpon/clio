<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Card } from "$lib/components/ui/card";
  import { Lock, Mail, User, Bookmark, Rss, Sparkles } from "lucide-svelte";
  import { API_BASE_URL } from "$lib/config";

  let name = $state<string>("");
  let email = $state<string>("");
  let password = $state<string>("");
  let confirmPassword = $state<string>("");
  let errorMessage = $state<string>("");
  let isLoading = $state<boolean>(false);
  let successMessage = $state<string>("");

  function validateForm(): boolean {
    // Reset error message
    errorMessage = "";

    // Check if all fields are filled
    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      errorMessage = "Please fill in all fields";
      return false;
    }

    // Validate name length
    if (name.trim().length < 2) {
      errorMessage = "Name must be at least 2 characters long";
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errorMessage = "Please enter a valid email address";
      return false;
    }

    // Check password length
    if (password.length < 6) {
      errorMessage = "Password must be at least 6 characters long";
      return false;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      errorMessage = "Passwords do not match";
      return false;
    }

    return true;
  }

  async function handleSignup(): Promise<void> {
    if (!validateForm()) {
      return;
    }

    isLoading = true;
    errorMessage = "";
    successMessage = "";

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password,
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("Email already exists");
        }
        if (response.status === 400) {
          const data = await response.json();
          throw new Error(data.message || "Invalid input");
        }
        throw new Error(`Signup failed: ${response.status}`);
      }

      const data = await response.json();

      successMessage =
        data?.message ||
        "Account created! Please check your email for a verification link before logging in.";

      // Reset form fields so user knows submission succeeded
      name = "";
      email = "";
      password = "";
      confirmPassword = "";
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

  function handleKeyPress(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      handleSignup();
    }
  }
</script>

<div class="min-h-screen bg-white flex">
  <!-- Left Side - Product Description -->
  <div
    class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FF6600] to-[#FF8533] p-12 flex-col justify-between relative overflow-hidden"
  >
    <!-- Background Pattern -->
    <div class="absolute inset-0 opacity-10">
      <div
        class="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl"
      ></div>
      <div
        class="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"
      ></div>
    </div>

    <div class="relative z-10">
      <!-- Logo/Brand -->
      <div class="flex items-center gap-3 mb-16">
        <div
          class="bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
        >
          <Rss class="w-6 h-6 text-[#FF6600]" />
        </div>
        <div>
          <h1 class="text-3xl font-bold text-white">feedit.live</h1>
        </div>
      </div>

      <!-- Hero Section -->
      <div class="max-w-md">
        <h2 class="text-4xl font-bold text-white mb-6 leading-tight">
          Start Your Journey to Better Content Management
        </h2>
        <p class="text-white/90 text-lg mb-12 leading-relaxed">
          Join thousands of users who have organized their digital life with
          feedit.live. It's free to start!
        </p>

        <!-- Benefits -->
        <div class="space-y-6">
          <div class="flex items-start gap-4">
            <div
              class="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            >
              <Sparkles class="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 class="text-white font-semibold text-lg mb-1">
                Free Forever
              </h3>
              <p class="text-white/80 text-sm">
                Get started with all essential features at no cost. Upgrade only
                when you need more.
              </p>
            </div>
          </div>

          <div class="flex items-start gap-4">
            <div
              class="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            >
              <Rss class="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 class="text-white font-semibold text-lg mb-1">
                RSS Feed Subscriptions
              </h3>
              <p class="text-white/80 text-sm">
                Subscribe to unlimited RSS feeds and stay updated with your
                favorite sources.
              </p>
            </div>
          </div>

          <div class="flex items-start gap-4">
            <div
              class="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            >
              <Bookmark class="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 class="text-white font-semibold text-lg mb-1">
                Unlimited Bookmarks
              </h3>
              <p class="text-white/80 text-sm">
                Save as many bookmarks as you want. No limits, no restrictions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Quote -->
    <div class="relative z-10">
      <p class="text-white/70 text-sm italic">
        "Simple, powerful, and exactly what I needed." - Happy User
      </p>
    </div>
  </div>

  <!-- Right Side - Signup Form -->
  <div
    class="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-[#FFF5EE] to-white"
  >
    <div class="w-full max-w-md">
      <!-- Mobile Logo -->
      <div class="lg:hidden flex items-center justify-center gap-3 mb-8">
        <div
          class="bg-[#FF6600] w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
        >
          <Rss class="w-6 h-6 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">feedit.live</h1>
      </div>

      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 mb-2">
          Create Your Account
        </h1>
        <p class="text-gray-600">
          Get started with feedit.live in less than a minute
        </p>
      </div>

      <Card class="bg-white rounded-xl shadow-xl p-8 border border-gray-100">
        <form
          onsubmit={(e) => {
            e.preventDefault();
            handleSignup();
          }}
          class="space-y-5"
        >
          {#if successMessage}
            <div
              class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm"
              role="status"
            >
              {successMessage}
            </div>
          {/if}

          <div>
            <label
              for="name"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Full Name
            </label>
            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <User class="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="name"
                type="text"
                placeholder="Your full name"
                bind:value={name}
                onkeypress={handleKeyPress}
                disabled={isLoading}
                class="pl-10 h-11 rounded-lg border-gray-200 focus:border-[#FF6600] focus:ring-[#FF6600]"
                autocomplete="name"
              />
            </div>
          </div>

          <div>
            <label
              for="email"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <Mail class="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                bind:value={email}
                onkeypress={handleKeyPress}
                disabled={isLoading}
                class="pl-10 h-11 rounded-lg border-gray-200 focus:border-[#FF6600] focus:ring-[#FF6600]"
                autocomplete="email"
              />
            </div>
          </div>

          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <Lock class="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                bind:value={password}
                onkeypress={handleKeyPress}
                disabled={isLoading}
                class="pl-10 h-11 rounded-lg border-gray-200 focus:border-[#FF6600] focus:ring-[#FF6600]"
                autocomplete="new-password"
              />
            </div>
          </div>

          <div>
            <label
              for="confirm-password"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirm Password
            </label>
            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <Lock class="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Re-enter your password"
                bind:value={confirmPassword}
                onkeypress={handleKeyPress}
                disabled={isLoading}
                class="pl-10 h-11 rounded-lg border-gray-200 focus:border-[#FF6600] focus:ring-[#FF6600]"
                autocomplete="new-password"
              />
            </div>
          </div>

          {#if errorMessage}
            <div
              class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
              role="alert"
            >
              {errorMessage}
            </div>
          {/if}

          <Button
            type="submit"
            onclick={handleSignup}
            disabled={isLoading}
            class="w-full h-11 bg-[#FF6600] hover:bg-[#FF8533] rounded-lg font-semibold text-base shadow-lg hover:shadow-xl transition-all"
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Already have an account?
            <a
              href="/login"
              class="text-[#FF6600] hover:text-[#FF8533] font-medium ml-1"
            >
              Sign in
            </a>
          </p>
        </div>
      </Card>

      <!-- Mobile Benefits Preview -->
      <div class="lg:hidden mt-8 space-y-4">
        <p class="text-center text-sm text-gray-500 font-medium">
          What you'll get
        </p>
        <div class="grid grid-cols-3 gap-3">
          <div class="text-center">
            <div
              class="bg-[#FFE6D5] w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2"
            >
              <Sparkles class="w-5 h-5 text-[#FF6600]" />
            </div>
            <p class="text-xs text-gray-600">Free Forever</p>
          </div>
          <div class="text-center">
            <div
              class="bg-[#FFE6D5] w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2"
            >
              <Rss class="w-5 h-5 text-[#FF6600]" />
            </div>
            <p class="text-xs text-gray-600">RSS Feeds</p>
          </div>
          <div class="text-center">
            <div
              class="bg-[#FFE6D5] w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2"
            >
              <Bookmark class="w-5 h-5 text-[#FF6600]" />
            </div>
            <p class="text-xs text-gray-600">Bookmarks</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
