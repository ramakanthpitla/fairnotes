"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

export type LikedProduct = {
  id: string;
  sku: string;
  title: string;
  description: string | null;
  type: "PDF" | "VIDEO";
  thumbnail: string | null;
  isFree: boolean;
  price?: number;
  duration?: number;
};

interface LikedProductsContextValue {
  liked: LikedProduct[];
  isLiked: (id: string) => boolean;
  toggleLike: (product: LikedProduct) => void;
}

const LikedProductsContext = createContext<LikedProductsContextValue | undefined>(
  undefined
);

const STORAGE_KEY_BASE = "studymart_liked_products_v1";

export function LikedProductsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [liked, setLiked] = useState<LikedProduct[]>([]);
  const { data: session } = useSession();

  const storageKey = useMemo(() => {
    const userId = session?.user?.id;
    return userId ? `${STORAGE_KEY_BASE}_${userId}` : `${STORAGE_KEY_BASE}_guest`;
  }, [session?.user?.id]);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LikedProduct[];
      if (Array.isArray(parsed)) {
        setLiked(parsed);
      }
    } catch (e) {
      console.warn("Failed to load liked products from storage", e);
    }
  }, [storageKey]);

  // Persist to localStorage when list changes
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(liked));
      }
    } catch (e) {
      console.warn("Failed to persist liked products", e);
    }
  }, [liked, storageKey]);

  const value = useMemo(() => {
    const isLiked = (id: string) => liked.some((p) => p.id === id);

    const toggleLike = (product: LikedProduct) => {
      setLiked((current) => {
        const exists = current.some((p) => p.id === product.id);
        if (exists) {
          return current.filter((p) => p.id !== product.id);
        }
        return [product, ...current];
      });
    };

    return { liked, isLiked, toggleLike };
  }, [liked]);

  return (
    <LikedProductsContext.Provider value={value}>
      {children}
    </LikedProductsContext.Provider>
  );
}

export function useLikedProducts() {
  const ctx = useContext(LikedProductsContext);
  if (!ctx) {
    throw new Error("useLikedProducts must be used within a LikedProductsProvider");
  }
  return ctx;
}
