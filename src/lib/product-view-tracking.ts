import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type ProductViewType = 'CONTENT' | 'SAMPLE';

export async function recordProductView(
  userId: string | null | undefined,
  productId: string,
  viewType: ProductViewType,
): Promise<'created' | 'updated' | 'skipped'> {
  if (!userId || !productId) {
    return 'skipped';
  }

  const client = prisma as any;

  try {
    await client.$transaction([
      client.productView.create({
        data: {
          userId,
          productId,
          type: viewType,
        },
      }),
      client.product.update({
        where: { id: productId },
        data: {
          viewCount: {
            increment: 1,
          },
        } as unknown as Prisma.ProductUncheckedUpdateInput,
      }),
    ]);

    return 'created';
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      if (viewType === 'CONTENT') {
        const { count } = await client.productView.updateMany({
          where: {
            userId,
            productId,
            NOT: { type: 'CONTENT' },
          },
          data: {
            type: 'CONTENT',
          },
        });

        return count > 0 ? 'updated' : 'skipped';
      }

      return 'skipped';
    }

    console.error('Failed to record product view', {
      userId,
      productId,
      viewType,
      error,
    });
    return 'skipped';
  }
}
