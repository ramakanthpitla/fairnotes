'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface DeleteProductButtonProps {
    productId: string;
    productTitle: string;
}

export function DeleteProductButton({ productId, productTitle }: DeleteProductButtonProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        const confirmed = window.confirm(
            `Are you sure you want to permanently delete "${productTitle}"?\n\nThis action cannot be undone. The product will be completely removed.`
        );

        if (!confirmed) {
            return;
        }

        setIsDeleting(true);

        try {
            const response = await fetch(`/api/admin/products/${productId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                let error: any;
                try {
                    error = await response.json();
                } catch {
                    error = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                console.error('Delete API response:', { status: response.status, error });
                throw new Error(error.error || 'Failed to delete product');
            }

            // Success - redirect to products list
            router.push('/admin/products');
            router.refresh();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert(error instanceof Error ? error.message : 'Failed to delete product. Please try again.');
            setIsDeleting(false);
        }
    };

    return (
        <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
        >
            {isDeleting ? 'Deleting...' : 'Delete Product'}
        </Button>
    );
}
