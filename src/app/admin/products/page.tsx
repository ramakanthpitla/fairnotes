import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ProductsList } from '@/components/admin/products-list';
import { enrichProductsWithMetrics } from '@/lib/admin/product-metrics';

export default async function AdminProductsPage() {
  await requireAdmin();

  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const enrichedProducts = await enrichProductsWithMetrics(products);

    const productsData = enrichedProducts.map(product => ({
      ...product,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    }));

    return (
      <div className="container mx-auto py-6 md:py-8 px-4">
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Products
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Manage study materials and pricing
            </p>
          </div>
          <Button asChild className="admin-touch-button badge-gradient-primary shadow-md w-full sm:w-auto">
            <Link href="/admin/products/new">New Product</Link>
          </Button>
        </div>

        <ProductsList initialProducts={productsData} />
      </div>
    );
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}
