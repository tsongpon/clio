<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Card } from "$lib/components/ui/card";
  import { Lock, Mail, Bookmark, Rss } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import { API_BASE_URL } from "$lib/config";

  let email = $state<string>("");
  let password = $state<string>("");
  let errorMessage = $state<string>("");
  let isLoading = $state<boolean>(false);

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

  function handleKeyPress(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      handleLogin();
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
          Your Personal Content Hub
        </h2>
        <p class="text-white/90 text-lg mb-12 leading-relaxed">
          Save, organize, and discover content that matters. Manage your
          bookmarks and RSS feeds all in one beautiful place.
        </p>

        <!-- Features -->
        <div class="space-y-6">
          <div class="flex items-start gap-4">
            <div
              class="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            >
              <Rss class="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 class="text-white font-semibold text-lg mb-1">
                RSS Feed Reader
              </h3>
              <p class="text-white/80 text-sm">
                Subscribe to your favorite blogs and news sources. Get all your
                updates in one unified feed.
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
                Smart Bookmarks
              </h3>
              <p class="text-white/80 text-sm">
                Save and organize your favorite websites with one click. Never
                lose track of important content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Quote -->
    <div class="relative z-10">
      <p class="text-white/70 text-sm italic">
        "The best way to stay informed and organized in the digital age."
      </p>
    </div>
  </div>

  <!-- Right Side - Login Form -->
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
          Welcome Back
        </h1>
        <p class="text-gray-600">Sign in to access your content hub</p>
      </div>

      <Card class="bg-white rounded-xl shadow-xl p-8 border border-gray-100">
        <form
          onsubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          class="space-y-6"
        >
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
                placeholder="Enter your password"
                bind:value={password}
                onkeypress={handleKeyPress}
                disabled={isLoading}
                class="pl-10 h-11 rounded-lg border-gray-200 focus:border-[#FF6600] focus:ring-[#FF6600]"
                autocomplete="current-password"
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
            onclick={handleLogin}
            disabled={isLoading}
            class="w-full h-11 bg-[#FF6600] hover:bg-[#FF8533] rounded-lg font-semibold text-base shadow-lg hover:shadow-xl transition-all"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Don't have an account?
            <a
              href="/signup"
              class="text-[#FF6600] hover:text-[#FF8533] font-medium ml-1"
            >
              Create one now
            </a>
          </p>
        </div>
      </Card>

      <!-- Mobile Features Preview -->
      <div class="lg:hidden mt-8 space-y-4">
        <p class="text-center text-sm text-gray-500 font-medium">
          Why choose feedit.live?
        </p>
        <div class="grid grid-cols-2 gap-4">
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
