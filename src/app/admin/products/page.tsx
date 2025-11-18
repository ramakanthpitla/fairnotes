import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ProductsList } from '@/components/admin/products-list';

type Product = {
  id: string;
  sku: string;
  title: string;
  description: string;
  type: string;
  fileUrl: string;
  thumbnail: string | null;
  isFree: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ProductPricing = {
  id: string;
  productId: string;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
};

type MongoPricingDocument = {
  _id: string;
  productId: string;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
};

type MongoAggregateResponse = {
  cursor?: {
    firstBatch: MongoPricingDocument[];
  };
  result?: MongoPricingDocument[];
};

type ProductWithPricing = Product & {
  pricing: ProductPricing[];
};

export default async function AdminProductsPage() {
  await requireAdmin();
  
  try {
    // First get all products
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sku: true,
        title: true,
        description: true,
        type: true,
        fileUrl: true,
        thumbnail: true,
        isFree: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Then get all active pricing for these products
    const productIds = products.map((p) => p.id);
    
    // Get all active pricing for the products
    const allPricing = await prisma.$runCommandRaw({
      aggregate: 'product_pricing',
      pipeline: [
        {
          $match: {
            productId: { $in: productIds },
            isActive: true
          }
        },
        { $sort: { duration: 1 } },
        {
          $project: {
            _id: { $toString: '$_id' },
            productId: 1,
            name: 1,
            price: 1,
            duration: 1,
            isActive: 1
          }
        }
      ],
      cursor: { batchSize: 100 }
    }) as MongoAggregateResponse;
    
    // Handle the response based on MongoDB version
    const pricingData = allPricing.cursor?.firstBatch || allPricing.result || [];

    // Group pricing by product ID
    const pricingByProduct = pricingData.reduce<Record<string, ProductPricing[]>>((acc, pricing) => {
      const productId = pricing.productId.toString();
      if (!acc[productId]) {
        acc[productId] = [];
      }
      acc[productId].push({
        id: pricing._id,
        productId: productId,
        name: pricing.name,
        price: pricing.price,
        duration: pricing.duration,
        isActive: pricing.isActive
      });
      return acc;
    }, {});

    // Combine products with their pricing
    const productsWithPricing: ProductWithPricing[] = products.map((product) => ({
      ...product,
      pricing: pricingByProduct[product.id] || []
    }));

    // Transform products to include pricing with proper structure
    const productsData = productsWithPricing.map(product => ({
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
