import * as SecureStore from "expo-secure-store";

const API_BASE = "https://heshel-be-python.onrender.com/api";
const TOKEN_KEY = "auth_access_token";

export async function saveToken(token: string): Promise<void> {
  console.log("[API] Saving token to SecureStore");
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  console.log("[API] Retrieved token:", token ? "exists" : "null");
  return token;
}

export async function clearToken(): Promise<void> {
  console.log("[API] Clearing token from SecureStore");
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export interface GlobalIngredient {
  id: string;
  name: string;
  aliases: string;
  category: string;
  default_unit: string;
  is_common: string;
  image: string;
  region: string;
}

export interface APIIngredient {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  user_id: string;
  global_id: string;
  global: GlobalIngredient;
}

async function authFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const token = await getToken();
  if (!token) {
    throw new Error("No auth token found. Please log in again.");
  }

  const url = `${API_BASE}${endpoint}`;
  console.log("[API] Fetching:", url);

  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[API] Error response:", response.status, text);
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response;
}

export async function fetchIngredients(): Promise<APIIngredient[]> {
  console.log("[API] Fetching ingredients");
  const response = await authFetch("/ingredients");
  const data = await response.json();
  console.log("[API] Fetched", data.length, "ingredients");
  return data;
}
