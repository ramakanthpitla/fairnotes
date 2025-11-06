import { FC } from 'react';

declare module '@/app/(main)/products/[id]/product-detail-content' {
  interface ProductDetailContentProps {
    product: {
      id: string;
      title: string;
      description: string | null;
      price: number;
      type: string;
      thumbnail: string | null;
      duration: number;
      isFree: boolean;
      fileUrl: string;
      sku: string;
      isActive: boolean;
    };
  }

  const ProductDetailContent: FC<ProductDetailContentProps>;
  
  export { ProductDetailContent };
}
