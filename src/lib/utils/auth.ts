/**
 * Get the stored JWT token from localStorage
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jwt_token");
}

/**
 * Store JWT token in localStorage
 */
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("jwt_token", token);
}

/**
 * Remove JWT token from localStorage
 */
export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("jwt_token");
  localStorage.removeItem("user");
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Make an authenticated API request
 * Automatically includes JWT token in Authorization header
 * Handles HTTP 500 errors and network errors by redirecting to error page
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken();

  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle server errors (500)
    if (response.status === 500) {
      // Check if we're in browser environment and not already on error page
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/error")
      ) {
        // Use window.location for navigation to ensure it works everywhere
        window.location.href = "/error";
      }
    }

    return response;
  } catch (error) {
    // A request cancelled by the caller (AbortController) isn't a network
    // failure; let the caller handle it.
    if (options.signal?.aborted) throw error;

    // Handle network errors (e.g., ERR_NAME_NOT_RESOLVED, Failed to fetch)
    // Only redirect if we're not already on the error page to prevent infinite loops
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.includes("/error")
    ) {
      console.error("Network error occurred:", error);
      window.location.href = "/error";
    }
    // Re-throw the error so calling code can handle it if needed
    throw error;
  }
}

/**
 * Get stored user information
 */
export function getUser(): any | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
}
