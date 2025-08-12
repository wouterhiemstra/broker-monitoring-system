import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrapingStatusData {
  isRunning: boolean;
  currentBroker?: string;
  progress: { completed: number; total: number };
  lastRun?: string;
  nextRun?: string;
}

interface BrokerStatus {
  id: string;
  name: string;
  tier: number;
  lastScrapedAt?: string;
  status: 'success' | 'warning' | 'error';
  newListings: number;
}

export function ScrapingStatus() {
  const { data: scrapingStatus } = useQuery<ScrapingStatusData>({
    queryKey: ["/api/scraping/status"],
    refetchInterval: 5000, // Refresh every 5 seconds when scraping
  });

  const { data: brokers } = useQuery<BrokerStatus[]>({
    queryKey: ["/api/brokers"],
  });

  const handleRetryBroker = async (brokerId: string) => {
    try {
      await fetch("/api/scraping/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brokerId }),
      });
    } catch (error) {
      console.error("Failed to retry broker:", error);
    }
  };

  const getStatusColor = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success': return 'bg-success';
      case 'warning': return 'bg-warning';
      case 'error': return 'bg-error';
      default: return 'bg-gray-400';
    }
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-200">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Scraping Status
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">Next scan in:</span>
            <Badge variant="secondary" className="font-medium">
              2h 34m
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {scrapingStatus?.isRunning && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-sm font-medium text-blue-800">
                Scraping in progress...
              </span>
              {scrapingStatus.currentBroker && (
                <span className="text-sm text-blue-600">
                  ({scrapingStatus.currentBroker})
                </span>
              )}
            </div>
            <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(scrapingStatus.progress.completed / scrapingStatus.progress.total) * 100}%`
                }}
              />
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {scrapingStatus.progress.completed} of {scrapingStatus.progress.total} completed
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {brokers?.map((broker) => (
            <div key={broker.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  getStatusColor(broker.status)
                )} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{broker.name}</p>
                  <p className="text-xs text-gray-500">
                    Last: {getTimeAgo(broker.lastScrapedAt)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {broker.status === 'error' ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRetryBroker(broker.id)}
                    className="text-xs px-2 py-1"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900">
                      {broker.newListings} new
                    </p>
                    <p className="text-xs text-gray-500">
                      Tier {broker.tier}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
