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

  console.log("response",response)

  return response;
}

export async function fetchIngredients(): Promise<APIIngredient[]> {
  console.log("[API] Fetching ingredients");
  const response = await authFetch("/ingredients");
  const data = await response.json();
  console.log("[API] Fetched", data.length, "ingredients");
  return data;
}

export interface CreateIngredientPayload {
  name: string;
  quantity: number;
  unit: string;
}

export interface CreateIngredientResponse {
  ingredient: {
    id: number;
    name: string;
    quantity: number;
    unit: string;
    user_id: string;
    global_id: string | null;
  };
}

export async function createIngredient(
  payload: CreateIngredientPayload
): Promise<CreateIngredientResponse> {
  console.log("[API] Creating ingredient:", payload);
  const response = await authFetch("/ingredients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  console.log("[API] Created ingredient:", data);
  return data;
}

export interface RecipeIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface RecipeVideo {
  video_id: string;
  title: string;
  author_name: string;
  thumbnail_url: string;
  link: string;
}

export interface APIRecipe {
  id: number;
  name: string;
  description: string;
  source: string;
  ingredients: RecipeIngredient[];
  technique_hints: string[];
  cuisine_type: string;
  effort_level: string;
  vibe: string;
  video: RecipeVideo | null;
}

export async function fetchRecipes(): Promise<APIRecipe[]> {
  console.log("[API] Fetching recipes");
  const response = await authFetch("/recipes");
  const data = await response.json();
  console.log("[API] Fetched", data.length, "recipes");
  return data;
}

export interface VideoInfo {
  video_id: string;
  title: string;
  author_name: string;
  thumbnail_url: string;
  link: string;
  html: string;
}

export async function fetchVideoInfo(videoId: string): Promise<VideoInfo> {
  console.log("[API] Fetching video info for:", videoId);
  const response = await authFetch(`/recipes/from-video?video_id=${videoId}`);
  const data = await response.json();
  console.log("[API] Video info:", data.title);
  return data;
}

export interface UserProfile {
  user: {
    id: string;
    email: string;
    email_confirmed_at: string;
    last_sign_in_at: string;
    created_at: string;
    updated_at: string;
    app_metadata: {
      provider: string;
      providers: string[];
    };
    user_metadata: {
      display_name?: string;
      full_name?: string;
      email?: string;
      email_verified?: boolean;
    };
  };
  counts: {
    recipes: number;
    ingredients: number;
    cooked: number;
  };
}

export async function fetchUserProfile(): Promise<UserProfile> {
  console.log("[API] Fetching user profile");
  const response = await authFetch("/users/me");
  const data = await response.json();
  console.log("[API] Fetched user profile:", data.user?.email);
  return data;
}

export async function processVideoCaption(videoId: string): Promise<any> {
  console.log("[API] Processing captions for:", videoId);
  const response = await authFetch(`/captions?video_id=${videoId}&analyze=true`, {
    method: "POST",
  });
  const data = await response.json();
  console.log("[API] Caption processing complete for:", videoId);
  return data;
}
