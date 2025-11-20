import { prisma } from '@/lib/prisma';
import type { Product, ProductPricing } from '@prisma/client';

export type AdminProductPricing = Pick<
  ProductPricing,
  'id' | 'productId' | 'name' | 'price' | 'duration' | 'isActive'
>;

export type AdminProductWithMetrics = {
  id: string;
  sku: string;
  title: string;
  description: string;
  type: string;
  fileUrl: string;
  thumbnail: string | null;
  isFree: boolean;
  isActive: boolean;
  viewCount: number;
  purchaseCount: number;
  activeCustomersCount: number;
  createdAt: Date;
  updatedAt: Date;
  pricing: AdminProductPricing[];
};

export async function enrichProductsWithMetrics(
  products: (Product & { viewCount?: number | null; purchaseCount?: number | null })[],
): Promise<AdminProductWithMetrics[]> {
  if (products.length === 0) {
    return [];
  }

  const productIds = products.map((product) => product.id);
  const now = new Date();

  const [
    pricingRecords,
    activePurchases,
    activeCreditUsages,
    completedPurchases,
  ] = await Promise.all([
    prisma.productPricing.findMany({
      where: {
        productId: { in: productIds },
        isActive: true,
      },
      orderBy: { duration: 'asc' },
      select: {
        id: true,
        productId: true,
        name: true,
        price: true,
        duration: true,
        isActive: true,
      },
    }),
    prisma.purchase.findMany({
      where: {
        productId: { in: productIds },
        status: 'COMPLETED',
        expiresAt: { gt: now },
      },
      select: {
        productId: true,
        userId: true,
      },
    }),
    prisma.creditUsage.findMany({
      where: {
        productId: { in: productIds },
        isActive: true,
        expiresAt: { gt: now },
      },
      select: {
        productId: true,
        userId: true,
      },
    }),
    prisma.purchase.findMany({
      where: {
        productId: { in: productIds },
        status: 'COMPLETED',
      },
      select: {
        productId: true,
      },
    }),
  ]);

  const pricingByProduct = new Map<string, AdminProductPricing[]>();
  pricingRecords.forEach((pricing) => {
    const key = pricing.productId;
    if (!pricingByProduct.has(key)) {
      pricingByProduct.set(key, []);
    }
    pricingByProduct.get(key)!.push(pricing);
  });

  const activeCustomerMap = new Map<string, Set<string>>();
  const trackActiveCustomer = (productId?: string | null, userId?: string | null) => {
    if (!productId || !userId) return;
    if (!activeCustomerMap.has(productId)) {
      activeCustomerMap.set(productId, new Set());
    }
    activeCustomerMap.get(productId)!.add(userId.toString());
  };

  activePurchases.forEach(({ productId, userId }) => trackActiveCustomer(productId, userId));
  activeCreditUsages.forEach(({ productId, userId }) => trackActiveCustomer(productId, userId));

  const purchaseCountMap = new Map<string, number>();
  completedPurchases.forEach(({ productId }) => {
    if (!productId) return;
    purchaseCountMap.set(productId, (purchaseCountMap.get(productId) ?? 0) + 1);
  });

  return products.map((product) => ({
    id: product.id,
    sku: product.sku,
    title: product.title,
    description: product.description,
    type: product.type,
    fileUrl: product.fileUrl,
    thumbnail: product.thumbnail,
    isFree: product.isFree,
    isActive: product.isActive,
    viewCount: product.viewCount ?? 0,
    purchaseCount: Math.max(
      product.purchaseCount ?? 0,
      purchaseCountMap.get(product.id) ?? 0,
    ),
    activeCustomersCount: activeCustomerMap.get(product.id)?.size ?? 0,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    pricing: pricingByProduct.get(product.id) ?? [],
  }));
}
