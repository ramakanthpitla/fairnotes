import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

type ProductViewer = {
  id: string;
  title: string;
  description: string;
  type: 'PDF' | 'VIDEO';
  fileUrl: string;
  thumbnail: string | null;
};

export default async function ViewerPage({ params }: { params: { id: string } }) {
  if (!params?.id) {
    return notFound();
  }

  try {
    const product = await prisma.product.findFirst({
      where: { 
        id: params.id,
        isActive: true,
        price: 0 // Free products have price 0
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        fileUrl: true,
        thumbnail: true
      }
    }) as ProductViewer | null;

    if (!product) {
      console.error('Free product not found or not active:', params.id);
      return notFound();
    }

    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
        
        {product.type === 'PDF' ? (
          <div className="w-full h-[80vh] bg-gray-100 rounded-lg flex items-center justify-center">
            <iframe 
              src={product.fileUrl} 
              className="w-full h-full"
              title={product.title}
            />
          </div>
        ) : (
          <div className="w-full aspect-video bg-black rounded-lg">
            <video 
              src={product.fileUrl}
              controls 
              className="w-full h-full"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error loading product:', error);
    return notFound();
  }
}
