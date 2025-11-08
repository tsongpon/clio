<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Card } from "$lib/components/ui/card";
  import { Lock, Mail, UserPlus, User } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import { setToken } from "$lib/utils/auth";
  import { API_BASE_URL } from "$lib/config";

  let name = $state<string>("");
  let email = $state<string>("");
  let password = $state<string>("");
  let confirmPassword = $state<string>("");
  let errorMessage = $state<string>("");
  let isLoading = $state<boolean>(false);

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

      // If backend returns a token on signup, store it and redirect
      if (data.token) {
        setToken(data.token);

        // Optionally store user info if returned
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        // Redirect to home page
        goto("/");
      } else {
        // If no token returned, redirect to login page
        goto("/login");
      }
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

<div
  class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4"
>
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div
        class="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
      >
        <UserPlus class="w-8 h-8 text-white" />
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-slate-900 mb-2">
        Create Account
      </h1>
      <p class="text-slate-600">Sign up to start managing your bookmarks</p>
    </div>

    <Card class="bg-white rounded-xl shadow-xl p-8">
      <form
        onsubmit={(e) => {
          e.preventDefault();
          handleSignup();
        }}
        class="space-y-6"
      >
        <div>
          <label
            for="name"
            class="block text-sm font-medium text-slate-700 mb-2"
          >
            Name
          </label>
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <User class="h-5 w-5 text-slate-400" />
            </div>
            <Input
              id="name"
              type="text"
              placeholder="Your full name"
              bind:value={name}
              onkeypress={handleKeyPress}
              disabled={isLoading}
              class="pl-10 h-11 rounded-lg"
              autocomplete="name"
            />
          </div>
        </div>

        <div>
          <label
            for="email"
            class="block text-sm font-medium text-slate-700 mb-2"
          >
            Email Address
          </label>
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <Mail class="h-5 w-5 text-slate-400" />
            </div>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              bind:value={email}
              onkeypress={handleKeyPress}
              disabled={isLoading}
              class="pl-10 h-11 rounded-lg"
              autocomplete="email"
            />
          </div>
        </div>

        <div>
          <label
            for="password"
            class="block text-sm font-medium text-slate-700 mb-2"
          >
            Password
          </label>
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <Lock class="h-5 w-5 text-slate-400" />
            </div>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              bind:value={password}
              onkeypress={handleKeyPress}
              disabled={isLoading}
              class="pl-10 h-11 rounded-lg"
              autocomplete="new-password"
            />
          </div>
        </div>

        <div>
          <label
            for="confirm-password"
            class="block text-sm font-medium text-slate-700 mb-2"
          >
            Confirm Password
          </label>
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <Lock class="h-5 w-5 text-slate-400" />
            </div>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              bind:value={confirmPassword}
              onkeypress={handleKeyPress}
              disabled={isLoading}
              class="pl-10 h-11 rounded-lg"
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
          class="w-full h-11 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-base shadow-lg hover:shadow-xl transition-all"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>
    </Card>

    <p class="text-center text-sm text-slate-600 mt-6">
      Already have an account?
      <a href="/login" class="text-blue-600 hover:text-blue-700 font-medium">
        Sign in
      </a>
    </p>
  </div>
</div>
