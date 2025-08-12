import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings, Play, Pause } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { brokerTiers } from "@/lib/brokers";
import { useToast } from "@/hooks/use-toast";

interface Broker {
  id: string;
  name: string;
  website: string;
  tier: number;
  isActive: boolean;
  lastScrapedAt?: string;
}

export default function Brokers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: brokers = [], isLoading } = useQuery<Broker[]>({
    queryKey: ["/api/brokers"],
  });

  const updateBrokerMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Broker> }) => {
      return apiRequest("PATCH", `/api/brokers/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brokers"] });
      toast({
        title: "Success",
        description: "Broker updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update broker",
        variant: "destructive",
      });
    },
  });

  const scrapebrokerMutation = useMutation({
    mutationFn: async (brokerId: string) => {
      return apiRequest("POST", "/api/scraping/start", { brokerId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Broker scraping started",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start scraping",
        variant: "destructive",
      });
    },
  });

  const handleToggleActive = (brokerId: string, isActive: boolean) => {
    updateBrokerMutation.mutate({ 
      id: brokerId, 
      updates: { isActive: !isActive } 
    });
  };

  const handleScrapeBroker = (brokerId: string) => {
    scrapebrokerMutation.mutate(brokerId);
  };

  const getTierBadgeColor = (tier: number) => {
    switch (tier) {
      case 1: return "bg-purple-100 text-purple-800";
      case 2: return "bg-blue-100 text-blue-800";
      case 3: return "bg-green-100 text-green-800";
      case 4: return "bg-yellow-100 text-yellow-800";
      case 5: return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getLastScrapedText = (lastScrapedAt?: string) => {
    if (!lastScrapedAt) return "Never";
    
    const date = new Date(lastScrapedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-40 bg-gray-200 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Brokers</h2>
          <p className="text-sm text-gray-600">
            Manage broker configurations and scraping settings
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Broker
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brokers.map((broker) => (
          <Card key={broker.id} className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                    {broker.name}
                  </CardTitle>
                  <p className="text-sm text-gray-500 break-all">
                    {broker.website}
                  </p>
                </div>
                <Badge className={getTierBadgeColor(broker.tier)}>
                  Tier {broker.tier}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active</span>
                <Switch 
                  checked={broker.isActive}
                  onCheckedChange={() => handleToggleActive(broker.id, broker.isActive)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last scraped</span>
                <span className="text-sm font-medium text-gray-900">
                  {getLastScrapedText(broker.lastScrapedAt)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tier Description</span>
                <span className="text-sm font-medium text-gray-900">
                  {brokerTiers[broker.tier as keyof typeof brokerTiers]}
                </span>
              </div>
              
              <div className="flex space-x-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleScrapeBroker(broker.id)}
                  disabled={scrapebrokerMutation.isPending || !broker.isActive}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Scrape Now
                </Button>
                <Button size="sm" variant="outline">
                  <Settings className="w-3 h-3 mr-1" />
                  Config
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {brokers.length === 0 && (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No brokers configured</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              Get started by adding your first broker configuration
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add First Broker
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
