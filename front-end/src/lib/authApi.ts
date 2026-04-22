const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");

export interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  specialty?: string | null;
  hospital?: string | null;
  avatarUrl?: string | null;
}

interface AuthResponse {
  accessToken: string;
  tokenType: string;
  user: ApiUser;
}

export interface UpdateCurrentUserPayload {
  fullName?: string;
  specialty?: string | null;
  hospital?: string | null;
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const hasJsonBody = init.body !== undefined && !(init.body instanceof FormData);

  if (hasJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const responseData = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const message =
      (typeof responseData === "object" && responseData !== null && "detail" in responseData && typeof responseData.detail === "string" && responseData.detail) ||
      (typeof responseData === "object" && responseData !== null && "message" in responseData && typeof responseData.message === "string" && responseData.message) ||
      "Une erreur est survenue.";

    throw new Error(message);
  }

  return responseData as T;
}

function withAuth(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function registerDoctor(email: string, password: string, fullName: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, fullName }),
  });
}

export async function loginDoctor(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getCurrentUser(token: string): Promise<ApiUser> {
  return apiRequest<ApiUser>("/users/me", {
    headers: withAuth(token),
  });
}

export async function updateCurrentUserProfile(token: string, payload: UpdateCurrentUserPayload): Promise<ApiUser> {
  return apiRequest<ApiUser>("/users/me", {
    method: "PUT",
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}