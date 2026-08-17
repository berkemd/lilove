import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuth } from 'firebase/auth';

/**
 * CSRF Token Management
 * Stores and manages the CSRF token for secure session-based requests
 */
let csrfToken: string | null = null;

/**
 * Get Firebase ID Token
 * Returns the current user's Firebase ID token for API authentication
 */
async function getFirebaseToken(): Promise<string | null> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  } catch (error) {
    console.error('Failed to get Firebase token:', error);
    return null;
  }
}

/**
 * Initialize CSRF token
 * Fetches a fresh CSRF token from the server and stores it
 * Should be called on app initialization
 */
export async function initCsrfToken(): Promise<void> {
  try {
    const response = await fetch('/api/csrf-token', { 
      credentials: 'include' 
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.statusText}`);
    }
    
    const data = await response.json();
    csrfToken = data.csrfToken;
    
    console.log('✅ CSRF token initialized');
  } catch (error) {
    console.error('❌ Failed to initialize CSRF token:', error);
    // Don't throw - allow app to continue but requests may fail
  }
}

/**
 * Get current CSRF token
 * Returns the stored CSRF token or null if not initialized
 */
export function getCsrfToken(): string | null {
  return csrfToken;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * API Request with CSRF protection and Firebase authentication
 * Automatically includes CSRF token for mutating requests (POST/PUT/PATCH/DELETE)
 * Automatically includes Firebase ID token in Authorization header
 */
export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  },
): Promise<Response> {
  const method = options?.method || "GET";
  const headers: Record<string, string> = {
    ...(options?.body ? { "Content-Type": "application/json" } : {}),
    ...options?.headers,
  };
  
  // Add CSRF token to mutating requests
  const isMutatingRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  if (isMutatingRequest && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  // Add Firebase token for authentication
  const firebaseToken = await getFirebaseToken();
  if (firebaseToken) {
    headers['Authorization'] = `Bearer ${firebaseToken}`;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: options?.body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build headers with Firebase token
    const headers: Record<string, string> = {};
    const firebaseToken = await getFirebaseToken();
    if (firebaseToken) {
      headers['Authorization'] = `Bearer ${firebaseToken}`;
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
