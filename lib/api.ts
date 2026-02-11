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
  image?: string | null;
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

export interface FeedRecipe {
  id: number;
  name: string;
  description: string;
  video_id?: string;
  ingredients: RecipeIngredient[];
  technique_hints: string[];
  cuisine_type: string;
  effort_level: string;
  vibe: string;
  video: RecipeVideo | null;
  distance?: number;
  match_count?: number;
}

interface FeedResultItem {
  distance: number;
  embedding_id: string;
  meta: {
    content: string;
    metadata: string;
    recipe_id: number;
  };
  recipe: {
    id: number;
    name: string;
    description: string;
    video_id?: string;
    ingredients: RecipeIngredient[];
    technique_hints: string[];
    cuisine_type: string;
    effort_level: string;
    vibe: string;
  };
  match_count: number;
}

export async function fetchFeedRecipes(
  vibe: string = "comfort",
  effort: string = "low",
  topK: number = 10
): Promise<FeedRecipe[]> {
  console.log("[API] Fetching feed recipes", { vibe, effort, topK });
  const response = await authFetch(
    `/search/feed?vibe=${encodeURIComponent(vibe)}&effort=${encodeURIComponent(effort)}&top_k=${topK}`,
    { method: "POST" }
  );
  const data = await response.json();

  const results: FeedResultItem[] = data?.results ?? data;
  console.log("[API] Raw feed response keys:", Object.keys(data ?? {}));

  const recipes: FeedRecipe[] = (Array.isArray(results) ? results : []).map((item: FeedResultItem) => {
    const r = item.recipe;
    const videoId = r.video_id ?? null;
    const video: RecipeVideo | null = videoId
      ? {
          video_id: videoId,
          title: r.name,
          author_name: "",
          thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          link: `https://www.youtube.com/watch?v=${videoId}`,
        }
      : null;

    return {
      id: r.id,
      name: r.name,
      description: r.description,
      video_id: r.video_id,
      ingredients: r.ingredients ?? [],
      technique_hints: r.technique_hints ?? [],
      cuisine_type: r.cuisine_type ?? "",
      effort_level: r.effort_level ?? "",
      vibe: r.vibe ?? "",
      video,
      distance: item.distance,
      match_count: item.match_count,
    };
  });

  console.log("[API] Parsed", recipes.length, "feed recipes");
  return recipes;
}

export interface SearchResult {
  distance: number;
  embedding_id: string;
  meta: {
    content: string;
    metadata: string;
    recipe_id: number;
  };
  recipe: {
    id: number;
    name: string;
    description: string;
    video_id?: string;
    ingredients: RecipeIngredient[];
    technique_hints: string[];
    cuisine_type: string;
    effort_level: string;
    vibe: string;
  };
}

export async function searchRecipes(
  query: string,
  topK: number = 5
): Promise<FeedRecipe[]> {
  console.log("[API] Searching recipes with query:", query);
  const response = await authFetch(`/search?top_k=${topK}`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
  const data = await response.json();
  const results: SearchResult[] = data?.results ?? [];
  console.log("[API] Search returned", results.length, "results");

  const recipes: FeedRecipe[] = results.map((item) => {
    const r = item.recipe;
    const videoId = r.video_id ?? null;
    const video: RecipeVideo | null = videoId
      ? {
          video_id: videoId,
          title: r.name,
          author_name: "",
          thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          link: `https://www.youtube.com/watch?v=${videoId}`,
        }
      : null;

    return {
      id: r.id,
      name: r.name,
      description: r.description,
      video_id: r.video_id,
      ingredients: r.ingredients ?? [],
      technique_hints: r.technique_hints ?? [],
      cuisine_type: r.cuisine_type ?? "",
      effort_level: r.effort_level ?? "",
      vibe: r.vibe ?? "",
      video,
      distance: item.distance,
    };
  });

  return recipes;
}

export interface ExtractedMatchedIngredient {
  name: string;
  global_ingredient: {
    id: string;
    name: string;
    aliases: string;
    category: string;
    default_unit: string;
    allowed_units: string;
    image: string;
    region: string;
    is_common: string;
    substitutes: string;
  };
}

export interface ExtractIngredientsResponse {
  from: string;
  matched: ExtractedMatchedIngredient[];
  unmatched: string[];
  raw_response: string;
}

export async function extractIngredientsFromImage(
  imageUri: string,
  from: "list" | "fridge"
): Promise<ExtractIngredientsResponse> {
  console.log("[API] Extracting ingredients from image, source:", from);
  const token = await getToken();
  if (!token) {
    throw new Error("No auth token found. Please log in again.");
  }

  const formData = new FormData();
  const filename = imageUri.split("/").pop() ?? "photo.jpg";
  const match = /\.([\w]+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("image", {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  const url = `${API_BASE}/captions/extract-ingredients?from=${from}`;
  console.log("[API] Uploading image to:", url);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[API] Extract ingredients error:", response.status, text);
    throw new Error(`Failed to extract ingredients: ${text}`);
  }

  const data = await response.json();
  console.log("[API] Extracted", data.matched?.length, "matched,", data.unmatched?.length, "unmatched");
  return data;
}

export interface BulkIngredientPayload {
  name: string;
  quantity: number;
  unit: string;
}

export async function bulkCreateIngredients(
  ingredients: BulkIngredientPayload[]
): Promise<any> {
  console.log("[API] Bulk creating", ingredients.length, "ingredients");
  const response = await authFetch("/ingredients/bulk", {
    method: "POST",
    body: JSON.stringify({ ingredients }),
  });
  const data = await response.json();
  console.log("[API] Bulk create result:", data);
  return data;
}

export async function imagesToRecipe(imageUris: string[]): Promise<any> {
  console.log("[API] Converting", imageUris.length, "images to recipe");
  const token = await getToken();
  if (!token) {
    throw new Error("No auth token found. Please log in again.");
  }

  const formData = new FormData();
  imageUris.forEach((uri, index) => {
    const filename = uri.split("/").pop() ?? `photo_${index}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";
    formData.append("images", {
      uri,
      name: filename,
      type,
    } as any);
  });

  const url = `${API_BASE}/captions/images-to-recipe`;
  console.log("[API] Uploading images to:", url);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[API] Images to recipe error:", response.status, text);
    throw new Error(`Failed to create recipe from images: ${text}`);
  }

  const data = await response.json();
  console.log("[API] Images to recipe result:", data);
  return data;
}

export async function fetchRecipeIngredientsRequired(
  recipeId: number
): Promise<string[]> {
  console.log("[API] Fetching ingredients_required for recipe:", recipeId);
  const response = await authFetch(`/recipes/${recipeId}`);
  const data = await response.json();
  console.log("[API] Recipe detail response keys:", Object.keys(data ?? {}));

  if (data?.ingredients_required && Array.isArray(data.ingredients_required)) {
    console.log("[API] Found ingredients_required:", data.ingredients_required.length);
    return data.ingredients_required;
  }

  return [];
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
