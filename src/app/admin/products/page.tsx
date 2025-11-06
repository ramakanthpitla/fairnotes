import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

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

        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Title</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Pricing Options</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {productsWithPricing.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-6 py-4">{product.title}</td>
                    <td className="whitespace-nowrap px-6 py-4 capitalize">{product.type}</td>
                    <td className="px-6 py-4">
                      {product.isFree ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">Free</Badge>
                      ) : product.pricing.length > 0 ? (
                        <div className="space-y-1">
                          {product.pricing.map((price) => (
                            <div key={price.id} className="text-sm">
                              <span className="font-medium">{price.name}:</span>{' '}
                              <span className="text-muted-foreground">
                                {formatCurrency(price.price)} for {price.duration} days
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No pricing set</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge variant={product.isActive ? 'default' : 'secondary'}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <Link href={`/admin/products/${product.id}`} className="text-primary hover:text-primary/80">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}
