'use client';

import React, { useMemo } from 'react';
import { Pill } from 'lucide-react';

interface SupplementItem {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  checked: boolean;
}

interface SupplementsTabProps {
  items: SupplementItem[];
  onToggle: (id: string) => void;
}

export const SupplementsTab: React.FC<SupplementsTabProps> = ({ items, onToggle }) => {
  const groupedItems = useMemo(() => {
    const timings = ['Morning', 'Afternoon', 'Evening', 'Bedtime'];
    const groups: Record<string, SupplementItem[]> = {};

    timings.forEach((timing) => {
      groups[timing] = items.filter((item) => item.timing === timing);
    });

    return groups;
  }, [items]);

  const allChecked = items.every((item) => item.checked);
  const someChecked = items.some((item) => item.checked);

  return (
    <div className="kairos-card space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-kairos-gold" />
          <h2 className="font-heading font-semibold text-white">Supplement Protocol</h2>
        </div>
        {someChecked && (
          <span className="text-xs font-body text-kairos-silver-dark">
            {items.filter((i) => i.checked).length}/{items.length}
          </span>
        )}
      </div>

      {/* Summary status */}
      {items.length > 0 && (
        <div className="p-3 rounded border border-kairos-border bg-kairos-gold/5">
          <p className="text-xs font-body text-kairos-silver">
            {allChecked ? (
              <span className="text-kairos-gold font-semibold">✓ All supplements completed</span>
            ) : someChecked ? (
              <span className="text-yellow-400 font-semibold">
                {items.filter((i) => i.checked).length} of {items.length} completed
              </span>
            ) : (
              <span>No supplements checked yet</span>
            )}
          </p>
        </div>
      )}

      {/* Grouped by timing */}
      <div className="space-y-6">
        {['Morning', 'Afternoon', 'Evening', 'Bedtime'].map((timing) => {
          const timingItems = groupedItems[timing] || [];

          if (timingItems.length === 0) {
            return null;
          }

          return (
            <div key={timing} className="space-y-3">
              <h3 className="text-sm font-semibold text-kairos-gold">{timing}</h3>
              <div className="space-y-2">
                {timingItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onToggle(item.id)}
                    className={`w-full p-3 rounded border transition-colors text-left flex items-start gap-3 ${
                      item.checked
                        ? 'border-kairos-gold bg-kairos-gold/10'
                        : 'border-kairos-border hover:border-kairos-gold/30'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`mt-1 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        item.checked
                          ? 'border-kairos-gold bg-kairos-gold/20'
                          : 'border-kairos-silver'
                      }`}
                    >
                      {item.checked && (
                        <span className="text-kairos-gold font-bold text-sm">✓</span>
                      )}
                    </div>

                    {/* Supplement details */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-body font-semibold ${
                          item.checked ? 'text-kairos-gold' : 'text-white'
                        }`}
                      >
                        {item.name}
                      </p>
                      <p className="text-xs font-body text-kairos-silver-dark">
                        {item.dosage}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="p-4 rounded border border-kairos-border text-center">
          <p className="text-sm font-body text-kairos-silver-dark">
            No supplement protocol loaded yet.
          </p>
          <p className="text-xs font-body text-kairos-silver-dark mt-1">
            Your personalized supplement list will appear here.
          </p>
        </div>
      )}
    </div>
  );
};
