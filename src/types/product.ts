import { Product, ProductPricing, ProductType } from '@prisma/client';

export interface ProductWithPricing extends Product {
  pricing: ProductPricing[];
}

export interface CreateProductInput {
  title: string;
  description: string;
  type: ProductType;
  fileUrl: string;
  thumbnail?: string | null;
  isActive?: boolean;
  pricing?: Array<{
    name: string;
    duration: number;
    price: number;
    isActive?: boolean;
  }>;
}

export interface UpdateProductInput {
  title?: string;
  description?: string;
  type?: ProductType;
  fileUrl?: string;
  thumbnail?: string | null;
  isActive?: boolean;
  pricing?: Array<{
    id?: string;
    name: string;
    duration: number;
    price: number;
    isActive?: boolean;
  }>;
}
