'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Edit, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ProductCustomersModal } from './product-customers-modal';

type ProductPricing = {
  id: string;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
};

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
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  purchaseCount: number;
  activeCustomersCount: number;
  pricing: ProductPricing[];
};

type ProductsListProps = {
  initialProducts: Product[];
};

export function ProductsList({ initialProducts }: ProductsListProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; title: string } | null>(null);
  const [sortKey, setSortKey] = useState<'createdAt' | 'viewCount' | 'purchaseCount' | 'activeCustomersCount'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setProducts(initialProducts);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/admin/products/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, initialProducts]);

  const handleDelete = async (productId: string, productTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${productTitle}"?\n\nThis action cannot be undone. The product will be completely removed.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to delete product');
        return;
      }

      // Success - remove from list
      setProducts(products.filter(p => p.id !== productId));
      alert('Product deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  const toggleSort = (key: 'createdAt' | 'viewCount' | 'purchaseCount' | 'activeCustomersCount') => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'createdAt' ? 'desc' : 'desc');
    }
  };

  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    sorted.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortKey) {
        case 'viewCount':
          aValue = a.viewCount;
          bValue = b.viewCount;
          break;
        case 'purchaseCount':
          aValue = a.purchaseCount;
          bValue = b.purchaseCount;
          break;
        case 'activeCustomersCount':
          aValue = a.activeCustomersCount;
          bValue = b.activeCustomersCount;
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }

      if (aValue === bValue) return 0;
      return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
    });
    return sorted;
  }, [products, sortKey, sortDirection]);

  const renderSortIndicator = (key: 'createdAt' | 'viewCount' | 'purchaseCount' | 'activeCustomersCount') => {
    if (sortKey !== key) return null;
    return <span className="ml-1 text-xs">{sortDirection === 'desc' ? '▼' : '▲'}</span>;
  };

  return (
    <>
      {/* Customer Modal */}
      {selectedProduct && (
        <ProductCustomersModal
          productId={selectedProduct.id}
          productTitle={selectedProduct.title}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, SKU, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {isSearching && (
            <div className="text-sm text-muted-foreground">Searching...</div>
          )}
        </div>

        {/* Products Table */}
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">SKU</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Title</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('viewCount')}>
                    Views
                    {renderSortIndicator('viewCount')}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('purchaseCount')}>
                    Purchases
                    {renderSortIndicator('purchaseCount')}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('activeCustomersCount')}>
                    Active Customers
                    {renderSortIndicator('activeCustomersCount')}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('createdAt')}>
                    Type
                    {renderSortIndicator('createdAt')}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Pricing Options</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <div className="font-medium">{product.title}</div>
                        {searchQuery && product.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">{product.viewCount}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">{product.purchaseCount}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">{product.activeCustomersCount}</td>
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
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedProduct({ id: product.id, title: product.title })}
                          title="View Customers"
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Customers
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link href={`/admin/products/${product.id}`}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(product.id, product.title)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedProducts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-muted-foreground">
                      {searchQuery ? 'No products found matching your search.' : 'No products found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
