import { requireAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HiddenInputUploader } from '@/components/admin/hidden-input-uploader';
import { PricingPlanInput } from '@/components/admin/pricing-plan-input';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

const planSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  price: z.number().min(0, 'Price must be 0 or more'),
  duration: z.number().min(1, 'Duration must be at least 1 day'),
});

async function createProduct(formData: FormData) {
  'use server';
  await requireAdmin();
  
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const type = formData.get('type') as string;
  const fileUrl = formData.get('fileUrl') as string;
  const thumbnail = formData.get('thumbnail') as string;
  const isFree = formData.get('isFree') === 'on';
  const isActive = formData.get('isActive') === 'on';

  // Get all plan entries from form data
  interface PlanEntry {
    name: string;
    price: string;
    duration: string;
  }
  
  const planEntries: PlanEntry[] = [];
  
  // Get the raw form data as an object
  const formDataObj = Object.fromEntries(formData.entries());
  
  // Find all unique plan indices
  const planIndices = new Set<string>();
  
  for (const key of formData.keys()) {
    const match = key.match(/^plans\[(\d+)]\.(name|price|duration)$/);
    if (match) {
      planIndices.add(match[1]);
    }
  }
  
  // Extract plan data for each index
  for (const index of planIndices) {
    const name = formData.get(`plans[${index}].name`);
    const price = formData.get(`plans[${index}].price`);
    const duration = formData.get(`plans[${index}].duration`);
    
    if (name && price && duration) {
      planEntries.push({
        name: name.toString(),
        price: price.toString(),
        duration: duration.toString(),
      });
    }
  }

  // Validate required fields
  if (!title || !description || !type || !fileUrl) {
    throw new Error('Missing required fields');
  }

  // If not free, validate plans
  if (!isFree) {
    if (planEntries.length === 0) {
      throw new Error('At least one pricing plan is required for paid products');
    }

    // Validate each plan
    for (const plan of planEntries) {
      try {
        // Ensure all required fields are present and have values
        if (!plan.name || !plan.price || !plan.duration) {
          console.error('Missing plan fields:', { plan });
          throw new Error('All plan fields (name, price, duration) are required');
        }
        
        // Convert string values to appropriate types
        const price = parseFloat(plan.price);
        const duration = parseInt(plan.duration, 10);
        
        if (isNaN(price) || isNaN(duration)) {
          throw new Error('Invalid price or duration format');
        }
        
        // Validate against schema
        planSchema.parse({
          name: plan.name,
          price,
          duration,
        });
        
      } catch (error) {
        console.error('Plan validation error:', error);
        if (error instanceof z.ZodError) {
          const firstError = error.issues[0];
          throw new Error(`Invalid plan: ${firstError.message}`);
        }
        throw error;
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    // For free products, create a default pricing plan
    if (isFree) {
      await tx.product.create({
        data: {
          title,
          description,
          type: type as any,
          fileUrl,
          thumbnail,
          isFree: true,
          isActive,
          sku: `PROD-${Date.now()}`,
          pricing: {
            create: {
              name: 'Free Access',
              price: 0,
              duration: 365, // 1 year
              isActive: true
            }
          }
        }
      });
    } else {
      // For paid products, create with the provided pricing plans
      if (planEntries.length === 0) {
        throw new Error('At least one pricing plan is required for paid products');
      }

      // Create the product first
      const product = await tx.product.create({
        data: {
          title,
          description,
          type: type as any,
          fileUrl,
          thumbnail,
          isFree: false,
          isActive,
          sku: `PROD-${Date.now()}`
        }
      });

      // Then create the pricing plans
      await Promise.all(
        planEntries.map(plan => 
          tx.productPricing.create({
            data: {
              productId: product.id,
              name: String(plan.name),
              price: Number(plan.price),
              duration: Number(plan.duration),
              isActive: true,
            }
          })
        )
      );
    }
  });

  redirect('/admin/products');
}

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">New Product</h1>

      <form action={createProduct} className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <Input name="title" required />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea name="description" required rows={5} />
        </div>

        <PricingPlanInput />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select name="type" defaultValue="PDF">
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="VIDEO">VIDEO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Active</label>
            <Input name="isActive" type="checkbox" defaultChecked />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center space-x-2">
            <Input id="isFree" name="isFree" type="checkbox" className="h-4 w-4" />
            <label htmlFor="isFree" className="text-sm font-medium leading-none">
              This is a free product
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            If checked, users can view this product without purchasing. No pricing plans will be created.
          </p>
        </div>

        <HiddenInputUploader 
          name="fileUrl"
          label="Upload File (PDF or Video)"
          accept="application/pdf,video/*"
        />

        <HiddenInputUploader 
          name="thumbnail"
          label="Upload Thumbnail (optional)"
          accept="image/*"
        />

        <div className="flex gap-3">
          <Button type="submit">Create</Button>
          <Button variant="outline" asChild>
            <a href="/admin/products">Cancel</a>
          </Button>
        </div>
      </form>
    </div>
  );
}


