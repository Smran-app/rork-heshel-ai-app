import createContextHook from "@nkzw/create-context-hook";
import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { processVideoCaption, imagesToRecipe } from "@/lib/api";

export interface QueueItem {
  id: string;
  type: "video" | "images";
  title: string;
  thumbnail: string;
  status: "pending" | "processing" | "success" | "error";
  message: string;
  imageUris?: string[];
}

const PROGRESS_MESSAGES = [
  "Extracting information...",
  "Analyzing the recipe...",
  "Checking ingredients...",
  "That seems to be a nice dish...",
  "Almost there...",
];

export const [RecipeQueueProvider, useRecipeQueue] = createContextHook(() => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const processingRef = useRef<boolean>(false);
  const queryClient = useQueryClient();

  const updateItem = useCallback((id: string, updates: Partial<QueueItem>) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  }, []);

  const dismissItem = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setQueue([]);
  }, []);

  const processQueue = useCallback(
    async (items: QueueItem[]) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setIsProcessing(true);

      for (const item of items) {
        updateItem(item.id, { status: "processing", message: PROGRESS_MESSAGES[0] });

        const messageInterval = setInterval(() => {
          setQueue((prev) => {
            const current = prev.find((q) => q.id === item.id);
            if (!current || current.status !== "processing") return prev;
            const currentIdx = PROGRESS_MESSAGES.indexOf(current.message);
            const nextIdx = Math.min(currentIdx + 1, PROGRESS_MESSAGES.length - 1);
            if (currentIdx === nextIdx) return prev;
            return prev.map((q) =>
              q.id === item.id
                ? { ...q, message: PROGRESS_MESSAGES[nextIdx] }
                : q
            );
          });
        }, 3000);

        try {
          if (item.type === "video") {
            await processVideoCaption(item.id);
          } else if (item.type === "images" && item.imageUris) {
            await imagesToRecipe(item.imageUris);
          }
          clearInterval(messageInterval);
          updateItem(item.id, { status: "success", message: "Recipe saved!" });
        } catch (err) {
          clearInterval(messageInterval);
          console.error("[Queue] Error processing:", item.id, err);
          updateItem(item.id, {
            status: "error",
            message: "Failed to process",
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      processingRef.current = false;
      setIsProcessing(false);

      setTimeout(() => {
        setQueue((prev) => prev.filter((item) => item.status !== "success"));
      }, 4000);
    },
    [updateItem, queryClient]
  );

  const addToQueue = useCallback(
    (items: { videoId: string; title: string; thumbnail: string }[]) => {
      const newItems: QueueItem[] = items.map((item) => ({
        id: item.videoId,
        type: "video" as const,
        title: item.title,
        thumbnail: item.thumbnail,
        status: "pending" as const,
        message: "Waiting...",
      }));
      setQueue((prev) => [...prev, ...newItems]);
      processQueue(newItems);
    },
    [processQueue]
  );

  const addImagesToQueue = useCallback(
    (imageUris: string[]) => {
      const queueId = `img_${Date.now()}`;
      const newItem: QueueItem = {
        id: queueId,
        type: "images",
        title: `Recipe from ${imageUris.length} image${imageUris.length > 1 ? "s" : ""}`,
        thumbnail: imageUris[0],
        status: "pending",
        message: "Waiting...",
        imageUris,
      };
      setQueue((prev) => [...prev, newItem]);
      processQueue([newItem]);
    },
    [processQueue]
  );

  return {
    queue,
    isProcessing,
    addToQueue,
    addImagesToQueue,
    dismissItem,
    dismissAll,
  };
});
