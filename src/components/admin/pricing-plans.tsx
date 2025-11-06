'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus } from 'lucide-react';

type PricingPlan = {
  id?: string;
  name: string;
  price: number;
  duration: number; // in days
  isActive: boolean;
};

type PricingPlansProps = {
  productId: string;
  initialPlans?: PricingPlan[];
  onPlansChange: (plans: PricingPlan[]) => void;
};

export function PricingPlans({ productId, initialPlans = [], onPlansChange }: PricingPlansProps) {
  const [plans, setPlans] = useState<PricingPlan[]>(
    initialPlans.length > 0 ? initialPlans : [
      { name: '1 Month', price: 0, duration: 30, isActive: true },
    ]
  );

  const addPlan = () => {
    const newPlan: PricingPlan = {
      name: '',
      price: 0,
      duration: 30,
      isActive: true,
    };
    setPlans([...plans, newPlan]);
  };

  const updatePlan = (index: number, field: keyof PricingPlan, value: any) => {
    const updatedPlans = [...plans];
    updatedPlans[index] = { ...updatedPlans[index], [field]: value };
    setPlans(updatedPlans);
    onPlansChange(updatedPlans);
  };

  const removePlan = (index: number) => {
    const updatedPlans = plans.filter((_, i) => i !== index);
    setPlans(updatedPlans);
    onPlansChange(updatedPlans);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Pricing Plans</h3>
        <Button type="button" size="sm" variant="outline" onClick={addPlan}>
          <Plus className="h-4 w-4 mr-2" />
          Add Plan
        </Button>
      </div>

      <div className="space-y-4">
        {plans.map((plan, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-medium">Plan {index + 1}</h4>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive/90"
                onClick={() => removePlan(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`plan-name-${index}`}>Plan Name</Label>
                <Input
                  id={`plan-name-${index}`}
                  value={plan.name}
                  onChange={(e) => updatePlan(index, 'name', e.target.value)}
                  placeholder="e.g., 1 Month, 3 Months, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`plan-price-${index}`}>Price (INR)</Label>
                <Input
                  id={`plan-price-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={plan.price}
                  onChange={(e) => updatePlan(index, 'price', Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`plan-duration-${index}`}>Duration (days)</Label>
                <Input
                  id={`plan-duration-${index}`}
                  type="number"
                  min="1"
                  value={plan.duration}
                  onChange={(e) => updatePlan(index, 'duration', Number(e.target.value))}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id={`plan-active-${index}`}
                checked={plan.isActive}
                onCheckedChange={(checked) => updatePlan(index, 'isActive', checked)}
              />
              <Label htmlFor={`plan-active-${index}`}>
                {plan.isActive ? 'Active' : 'Inactive'}
              </Label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
