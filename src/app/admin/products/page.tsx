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
      <div className="container mx-auto py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground">Manage study materials and pricing</p>
          </div>
          <Button asChild>
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
