import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/product/card';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/lib/auth';

export const metadata = {
  title: 'Browse Materials',
};

export default async function BrowsePage() {
  // Require authentication to browse
  await requireAuth();
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      pricing: {
        where: { isActive: true },
        orderBy: { price: 'asc' }
      }
    },
  });

  return (
    <div className="container mx-auto py-4 px-4 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Browse Study Materials</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Pick from PDFs and Videos; prices in INR.</p>
      </div>

      <div className="grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={{
              id: p.id,
              sku: p.sku,
              title: p.title,
              description: p.description,
              price: p.price,
              type: p.type as 'PDF' | 'VIDEO',
              thumbnail: p.thumbnail,
              duration: p.duration,
              isFree: p.isFree,
              pricingPlans: (p.pricing || []).map(plan => ({
                id: plan.id,
                name: plan.name,
                price: Number(plan.price),
                duration: Number(plan.duration),
                isActive: plan.isActive
              }))
            }}
          />
        ))}
        {products.length === 0 && (
          <div className="col-span-full rounded-md border p-6 text-center text-sm text-muted-foreground">
            No products yet.
          </div>
        )}
      </div>
    </div>
  );
}


