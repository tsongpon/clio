<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import { CheckCircle, Loader2, XCircle } from "lucide-svelte";
  import { API_BASE_URL } from "$lib/config";

  type VerificationState = "idle" | "verifying" | "success" | "error";

  let status = $state<VerificationState>("idle");
  let message = $state<string>("");

  async function verifyEmail(token: string): Promise<void> {
    status = "verifying";
    message = "Hold on while we confirm your email...";

    try {
      const response = await fetch(
        `${API_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        let errorMessage = "Verification failed. Please request a new link.";
        try {
          const data = await response.json();
          if (data?.message) {
            errorMessage = data.message;
          }
        } catch {
          // Ignore JSON parsing errors
        }
        throw new Error(errorMessage);
      }

      try {
        const data = await response.json();
        if (data?.message) {
          message = data.message;
        } else {
          message = "Your email has been verified successfully.";
        }
      } catch {
        message = "Your email has been verified successfully.";
      }

      status = "success";
    } catch (error) {
      status = "error";
      message =
        error instanceof Error
          ? error.message
          : "Something went wrong while verifying your email.";
    }
  }

  $effect(() => {
    const token = $page.url.searchParams.get("token");

    if (!token) {
      status = "error";
      message = "Your verification link is invalid or has expired.";
      return;
    }

    if (status === "idle") {
      verifyEmail(token);
    }
  });

  function goToLogin(): void {
    goto("/login");
  }
</script>

<div
  class="min-h-screen bg-gradient-to-br from-[#FFF5EE] to-white flex items-center justify-center p-4"
>
  <div class="w-full max-w-lg">
    <Card class="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
      <div class="flex justify-center">
        {#if status === "success"}
          <div class="bg-green-50 rounded-full p-4">
            <CheckCircle class="w-12 h-12 text-green-500" />
          </div>
        {:else if status === "error"}
          <div class="bg-red-50 rounded-full p-4">
            <XCircle class="w-12 h-12 text-red-500" />
          </div>
        {:else}
          <div class="bg-orange-50 rounded-full p-4 animate-spin-slow">
            <Loader2 class="w-12 h-12 text-[#FF6600]" />
          </div>
        {/if}
      </div>

      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          {#if status === "success"}
            Email Verified
          {:else if status === "error"}
            Verification Failed
          {:else}
            Verifying Email
          {/if}
        </h1>
        <p class="text-gray-600">{message}</p>
      </div>

      {#if status === "success"}
        <Button
          class="w-full h-12 bg-[#FF6600] hover:bg-[#FF8533] rounded-lg font-semibold text-base shadow-lg hover:shadow-xl transition-all"
          onclick={goToLogin}
        >
          Go to Login
        </Button>
      {/if}
    </Card>
  </div>
</div>

<style>
  .animate-spin-slow {
    animation: spin 1.2s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
