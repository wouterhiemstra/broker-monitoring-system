import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
    label: string;
  };
  icon: ReactNode;
  iconBgColor?: string;
}

export function KPICard({ title, value, change, icon, iconBgColor = "bg-primary" }: KPICardProps) {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change && (
              <p className={cn(
                "text-xs flex items-center mt-1",
                change.type === 'increase' ? "text-success" :
                change.type === 'decrease' ? "text-warning" :
                "text-gray-500"
              )}>
                <span className="mr-1">
                  {change.type === 'increase' ? '↑' : 
                   change.type === 'decrease' ? '↓' : '−'}
                </span>
                {change.value} {change.label}
              </p>
            )}
          </div>
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center",
            iconBgColor,
            iconBgColor.includes('bg-') ? 'bg-opacity-10' : ''
          )}>
            <div className={cn(
              "text-lg",
              iconBgColor.replace('bg-', 'text-')
            )}>
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
