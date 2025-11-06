'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

type PricingPlan = {
  id: string;
  name: string;
  price: number;
  duration: number;
};

export function PricingPlanInput() {
  const [plans, setPlans] = useState<PricingPlan[]>([
    { id: crypto.randomUUID(), name: '1 Month', price: 0, duration: 30 }
  ]);

  const addPlan = () => {
    setPlans([...plans, { 
      id: crypto.randomUUID(), 
      name: '', 
      price: 0, 
      duration: 30 
    }]);
  };

  const removePlan = (id: string) => {
    if (plans.length > 1) {
      setPlans(plans.filter(plan => plan.id !== id));
    }
  };

  const updatePlan = (id: string, field: keyof PricingPlan, value: string | number) => {
    setPlans(plans.map(plan => 
      plan.id === id ? { ...plan, [field]: value } : plan
    ));
  };

  // Add a hidden input to ensure form submission works with empty arrays
  if (plans.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium">Pricing Plans</label>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={addPlan}
          >
            + Add Plan
          </Button>
        </div>
        <input type="hidden" name="plans" value="[]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">Pricing Plans</label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={addPlan}
        >
          + Add Plan
        </Button>
      </div>

      <div className="space-y-4">
        {plans.map((plan, index) => (
          <div key={plan.id} className="grid grid-cols-12 gap-3 items-start">
            <div className="col-span-12 sm:col-span-4">
              <label className="text-xs text-muted-foreground">Plan Name</label>
              <Input
                name={`plans[${index}].name`}
                value={plan.name}
                onChange={(e) => updatePlan(plan.id, 'name', e.target.value)}
                placeholder="e.g., 1 Month"
                required
              />
              <input type="hidden" name={`plans[${index}].id`} value={plan.id} />
            </div>
            <div className="col-span-6 sm:col-span-3">
              <label className="text-xs text-muted-foreground">Price (₹)</label>
              <Input
                type="number"
                name={`plans[${index}].price`}
                value={plan.price}
                onChange={(e) => updatePlan(plan.id, 'price', Number(e.target.value))}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="col-span-5 sm:col-span-3">
              <label className="text-xs text-muted-foreground">Duration (days)</label>
              <Input
                type="number"
                name={`plans[${index}].duration`}
                value={plan.duration}
                onChange={(e) => updatePlan(plan.id, 'duration', Number(e.target.value))}
                min="1"
                required
              />
            </div>
            <div className="col-span-1 flex items-end h-10">
              {plans.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => removePlan(plan.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
