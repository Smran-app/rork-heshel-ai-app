export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  image: string;
}

export const kitchenIngredients: Ingredient[] = [
  { id: "1", name: "Tomatoes", quantity: "2", image: "https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=200&h=200&fit=crop" },
  { id: "2", name: "Eggs", quantity: "3", image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&h=200&fit=crop" },
  { id: "3", name: "Basil", quantity: "1 bunch", image: "https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=200&h=200&fit=crop" },
  { id: "4", name: "Milk", quantity: "1 L", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop" },
  { id: "5", name: "Garlic", quantity: "4 cloves", image: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2571?w=200&h=200&fit=crop" },
  { id: "6", name: "Onions", quantity: "3", image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=200&h=200&fit=crop" },
];

export interface SavedRecipe {
  id: string;
  title: string;
  subtitle: string;
  source: string;
  ingredientCount: number;
  image: string;
}

export const savedRecipes: SavedRecipe[] = [
  {
    id: "1",
    title: "Aloo Matar",
    subtitle: "Potatoes & Peas Curry",
    source: "YouTube",
    ingredientCount: 20,
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&h=200&fit=crop",
  },
  {
    id: "2",
    title: "Pasta Primavera",
    subtitle: "Fresh Veggie Pasta",
    source: "Instagram",
    ingredientCount: 12,
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=300&h=200&fit=crop",
  },
];
