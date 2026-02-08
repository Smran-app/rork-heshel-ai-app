import createContextHook from "@nkzw/create-context-hook";
import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { processVideoCaption } from "@/lib/api";

export interface QueueItem {
  videoId: string;
  title: string;
  thumbnail: string;
  status: "pending" | "processing" | "success" | "error";
  message: string;
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

  const updateItem = useCallback((videoId: string, updates: Partial<QueueItem>) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.videoId === videoId ? { ...item, ...updates } : item
      )
    );
  }, []);

  const dismissItem = useCallback((videoId: string) => {
    setQueue((prev) => prev.filter((item) => item.videoId !== videoId));
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
        updateItem(item.videoId, { status: "processing", message: PROGRESS_MESSAGES[0] });

        const messageInterval = setInterval(() => {
          setQueue((prev) => {
            const current = prev.find((q) => q.videoId === item.videoId);
            if (!current || current.status !== "processing") return prev;
            const currentIdx = PROGRESS_MESSAGES.indexOf(current.message);
            const nextIdx = Math.min(currentIdx + 1, PROGRESS_MESSAGES.length - 1);
            if (currentIdx === nextIdx) return prev;
            return prev.map((q) =>
              q.videoId === item.videoId
                ? { ...q, message: PROGRESS_MESSAGES[nextIdx] }
                : q
            );
          });
        }, 3000);

        try {
          await processVideoCaption(item.videoId);
          clearInterval(messageInterval);
          updateItem(item.videoId, { status: "success", message: "Recipe saved!" });
        } catch (err) {
          clearInterval(messageInterval);
          console.error("[Queue] Error processing:", item.videoId, err);
          updateItem(item.videoId, {
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
        ...item,
        status: "pending" as const,
        message: "Waiting...",
      }));
      setQueue((prev) => [...prev, ...newItems]);
      processQueue(newItems);
    },
    [processQueue]
  );

  return {
    queue,
    isProcessing,
    addToQueue,
    dismissItem,
    dismissAll,
  };
});
