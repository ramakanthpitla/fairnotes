'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Users, X } from 'lucide-react';

type Customer = {
  purchaseId: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  plan: string;
  price: number;
  duration: number;
  purchaseDate: string;
  expiresAt: string;
  isActive: boolean;
  status: string;
};

type ProductCustomersModalProps = {
  productId: string;
  productTitle: string;
  isOpen: boolean;
  onClose: () => void;
};

export function ProductCustomersModal({
  productId,
  productTitle,
  isOpen,
  onClose,
}: ProductCustomersModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeCustomers, setActiveCustomers] = useState<Customer[]>([]);
  const [expiredCustomers, setExpiredCustomers] = useState<Customer[]>([]);
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    if (isOpen && productId) {
      fetchCustomers();
    }
  }, [isOpen, productId]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/customers`);
      if (response.ok) {
        const data = await response.json();
        setActiveCustomers(data.active || []);
        setExpiredCustomers(data.expired || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customers for: {productTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Customers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">
                  Active Customers ({activeCustomers.length})
                </h3>
              </div>
              
              {activeCustomers.length === 0 ? (
                <p className="text-muted-foreground text-sm">No active customers</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">Customer</th>
                        <th className="px-4 py-2 text-left">Plan</th>
                        <th className="px-4 py-2 text-left">Price</th>
                        <th className="px-4 py-2 text-left">Purchase Date</th>
                        <th className="px-4 py-2 text-left">Expires</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {activeCustomers.map((customer) => (
                        <tr key={customer.purchaseId} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium">{customer.customerName || 'N/A'}</div>
                              <div className="text-xs text-muted-foreground">{customer.customerEmail}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{customer.plan}</Badge>
                          </td>
                          <td className="px-4 py-3">₹{customer.price}</td>
                          <td className="px-4 py-3">
                            {format(new Date(customer.purchaseDate), 'MMM d, yyyy')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {format(new Date(customer.expiresAt), 'MMM d, yyyy')}
                              <Badge variant="default" className="bg-green-500">Active</Badge>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Expired Customers Toggle */}
            {expiredCustomers.length > 0 && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExpired(!showExpired)}
                  className="mb-3"
                >
                  {showExpired ? 'Hide' : 'Show'} Expired Customers ({expiredCustomers.length})
                </Button>

                {showExpired && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left">Customer</th>
                          <th className="px-4 py-2 text-left">Plan</th>
                          <th className="px-4 py-2 text-left">Price</th>
                          <th className="px-4 py-2 text-left">Expired On</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {expiredCustomers.map((customer) => (
                          <tr key={customer.purchaseId} className="hover:bg-muted/50 opacity-60">
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium">{customer.customerName || 'N/A'}</div>
                                <div className="text-xs text-muted-foreground">{customer.customerEmail}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">{customer.plan}</Badge>
                            </td>
                            <td className="px-4 py-3">₹{customer.price}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {format(new Date(customer.expiresAt), 'MMM d, yyyy')}
                                <Badge variant="secondary">Expired</Badge>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
