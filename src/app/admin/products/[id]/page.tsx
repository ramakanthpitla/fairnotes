import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { redirect } from 'next/navigation';
import { HiddenInputUploader } from '@/components/admin/hidden-input-uploader';
import { PricingPlans } from '@/components/admin/pricing-plans';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type HiddenInputUploaderProps = {
  name: string;
  label: string;
  accept?: string;
};

type Product = {
  id: string;
  title: string;
  description: string;
  type: string;
  fileUrl: string;
  thumbnail: string | null;
  isFree: boolean;
  isActive: boolean;
  price: number;
  duration: number;
  pricingPlans?: Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
    isActive: boolean;
  }>;
};

async function updateProduct(id: string, formData: FormData) {
  'use server';
  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const type = String(formData.get('type') || '').trim();
  const price = Number(formData.get('price'));
  const duration = Number(formData.get('duration'));
  const fileUrl = String(formData.get('fileUrl') || '').trim();
  const thumbnail = String(formData.get('thumbnail') || '').trim() || null;
  const isActive = formData.get('isActive') === 'on';
  const isFree = formData.get('isFree') === 'on';

  // Get pricing plans data from form data
  const pricingPlans = JSON.parse(String(formData.get('pricingPlans') || '[]')) as Array<{
    id?: string;
    name: string;
    price: number;
    duration: number;
    isActive: boolean;
  }>;

  // Start a transaction to update product and pricing plans
  await prisma.$transaction(async (tx) => {
    // Update the product
    await tx.product.update({
      where: { id },
      data: {
        title,
        description,
        type: type as any,
        fileUrl,
        thumbnail,
        isActive,
        isFree,
      },
    });

    // Update or create pricing plans
    if (!isFree && Array.isArray(pricingPlans)) {
      const existingPlans = await tx.productPricing.findMany({
        where: { productId: id },
        select: { id: true },
      });

      const existingPlanIds = existingPlans.map(plan => plan.id);
      const newPlanIds = pricingPlans
        .filter(plan => plan.id)
        .map(plan => plan.id as string);

      // Delete removed plans
      const plansToDelete = existingPlanIds.filter(id => !newPlanIds.includes(id));
      if (plansToDelete.length > 0) {
        await tx.productPricing.deleteMany({
          where: { id: { in: plansToDelete } },
        });
      }

      // Update or create plans
      for (const plan of pricingPlans) {
        const { id: planId, ...planData } = plan;
        if (planId) {
          await tx.productPricing.update({
            where: { id: planId },
            data: {
              ...planData,
              productId: id,
            },
          });
        } else {
          await tx.productPricing.create({
            data: {
              ...planData,
              productId: id,
            },
          });
        }
      }
    } else if (isFree) {
      // If product is free, remove all pricing plans
      await tx.productPricing.deleteMany({
        where: { productId: id },
      });
    }
  });

  redirect('/admin/products');
}

async function deleteProduct(id: string) {
  'use server';
  
  // Force delete the product even with purchases
  // Purchase records will remain but productId will be set to null
  await prisma.$transaction([
    // First, update all purchases to set productId to null
    prisma.purchase.updateMany({
      where: { productId: id },
      data: { productId: null as any },
    }),
    // Then, delete all pricing plans
    prisma.productPricing.deleteMany({
      where: { productId: id },
    }),
    // Finally, delete the product
    prisma.product.delete({
      where: { id },
    }),
  ]);
  
  // Redirect after successful deletion
  redirect('/admin/products');
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  
  const { id } = await params;
  
  if (!id) {
    redirect('/admin/products');
  }

  let product: Product | null = null;
  
  try {
    const result = await prisma.product.findFirst({
      where: { 
        id: id
      },
      include: {
        pricing: {
          where: { isActive: true },
          orderBy: { duration: 'asc' },
        },
      },
    });
    
    if (!result) {
      console.error(`Product not found with id: ${id}`);
      redirect('/admin/products');
    }
    
    product = {
      id: result.id,
      title: result.title,
      description: result.description || '',
      type: result.type,
      fileUrl: result.fileUrl || '',
      thumbnail: result.thumbnail,
      isFree: result.isFree,
      isActive: result.isActive,
      price: result.pricing[0]?.price || 0,
      duration: result.pricing[0]?.duration || 30,
      pricingPlans: result.pricing.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        duration: p.duration,
        isActive: p.isActive,
      })),
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    redirect('/admin/products');
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Product</h1>
        <form action={async (formData: FormData) => {
          'use server';
          await deleteProduct(product!.id);
        }}>
          <Button 
            type="submit" 
            variant="destructive"
          >
            Delete Product
          </Button>
        </form>
      </div>

      <form 
        action={async (fd) => {
          'use server';
          await updateProduct(product!.id, fd);
        }}
        className="space-y-6 max-w-4xl"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <Input name="title" defaultValue={product?.title || ''} required />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea name="description" required rows={5} defaultValue={product?.description || ''} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select name="type" defaultValue={product?.type || 'PDF'}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="VIDEO">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">File URL</label>
            <HiddenInputUploader 
              name="fileUrl" 
              label="Upload File (PDF or Video)" 
              accept="application/pdf,video/*" 
              defaultValue={product?.fileUrl || ''}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Thumbnail URL</label>
            <HiddenInputUploader 
              name="thumbnail" 
              label="Upload Thumbnail" 
              accept="image/*" 
              defaultValue={product?.thumbnail || ''}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch 
                id="isFree" 
                name="isFree" 
                defaultChecked={product?.isFree} 
              />
              <Label htmlFor="isFree">Free Product</Label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Price (in INR)</label>
            <Input 
              type="number" 
              name="price" 
              defaultValue={product?.price || 0} 
              min="0" 
              step="0.01" 
              required 
              disabled={product?.isFree}
              className={product?.isFree ? 'bg-gray-100' : ''}
            />
            {product?.isFree && (
              <p className="text-xs text-gray-500">Price is 0 for free products</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Duration (in days)</label>
            <Input 
              type="number" 
              name="duration" 
              defaultValue={product?.duration || 30} 
              min="1" 
              required 
              disabled={product?.isFree}
              className={product?.isFree ? 'bg-gray-100' : ''}
            />
            {product?.isFree && (
              <p className="text-xs text-gray-500">Duration is not applicable for free products</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch 
                id="isActive" 
                name="isActive" 
                defaultChecked={product?.isActive} 
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <div className="col-span-full space-y-6">
            {!product?.isFree && (
              <div className="border-t border-gray-200 pt-6">
                <PricingPlans 
                  productId={product?.id} 
                  initialPlans={product?.pricingPlans || []}
                />
                <input type="hidden" name="pricingPlans" value={JSON.stringify(product?.pricingPlans || [])} />
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" className="w-full sm:w-auto">
                Update Product
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

