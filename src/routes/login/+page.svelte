<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Card } from "$lib/components/ui/card";
  import { Lock, Mail } from "lucide-svelte";
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

<div
  class="min-h-screen bg-gradient-to-br from-[#FFF5EE] to-white flex items-center justify-center p-4"
>
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div
        class="bg-[#FF6600] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
      >
        <Lock class="w-8 h-8 text-white" />
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-gray-900 mb-2">
        Welcome Back
      </h1>
      <p class="text-gray-600">Sign in to access your feeds</p>
    </div>

    <Card class="bg-white rounded-xl shadow-xl p-8">
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
              class="pl-10 h-11 rounded-lg border-[#FFBA80] focus:border-[#FF6600] focus:ring-[#FF6600]"
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
              class="pl-10 h-11 rounded-lg border-[#FFBA80] focus:border-[#FF6600] focus:ring-[#FF6600]"
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
    </Card>

    <p class="text-center text-sm text-gray-600 mt-6">
      Don't have an account?
      <a href="/signup" class="text-[#FF6600] hover:text-[#FF6600] font-medium">
        Sign up
      </a>
    </p>
  </div>
</div>
