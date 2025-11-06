declare module '@/app/(main)/products/[id]/product-detail-content' {
  import { FC } from 'react';
  
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
  
  export const ProductDetailContent: FC<ProductDetailContentProps>;
}
