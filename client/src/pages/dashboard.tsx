import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ScrapingStatus } from "@/components/dashboard/scraping-status";
import { ListingTable } from "@/components/listings/listing-table";
import { 
  List, 
  CheckCircle, 
  PoundSterling, 
  Users, 
  Play,
  Download,
  Search,
  FileSpreadsheet,
  Settings,
  BarChart3
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface KPIData {
  todayListings: number;
  qualified: number;
  avgEbitda: number;
  activeBrokers: number;
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: kpis } = useQuery<KPIData>({
    queryKey: ["/api/kpis"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const startScrapingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/scraping/start", {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Manual scraping started successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/scraping/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start scraping",
        variant: "destructive",
      });
    },
  });

  const handleExport = async () => {
    try {
      const response = await fetch("/api/export/excel");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'broker_listings.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'manualScrape':
        startScrapingMutation.mutate();
        break;
      case 'exportData':
        handleExport();
        break;
      default:
        toast({
          title: "Info",
          description: `${action} functionality coming soon`,
        });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-600">
            {new Date().toLocaleDateString('en-GB', { 
              weekday: 'long',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Scraping Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600">Last scan: 2 mins ago</span>
          </div>
          
          {/* Action Buttons */}
          <Button 
            onClick={() => startScrapingMutation.mutate()}
            disabled={startScrapingMutation.isPending}
            className="bg-primary hover:bg-blue-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {startScrapingMutation.isPending ? "Starting..." : "Start Scan"}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Today's Listings"
          value={kpis?.todayListings || 0}
          change={{
            value: "+3",
            type: "increase",
            label: "vs yesterday"
          }}
          icon={<List />}
          iconBgColor="bg-primary"
        />
        
        <KPICard
          title="Qualified"
          value={kpis?.qualified || 0}
          change={{
            value: "+2",
            type: "increase", 
            label: "vs yesterday"
          }}
          icon={<CheckCircle />}
          iconBgColor="bg-success"
        />
        
        <KPICard
          title="Avg EBITDA"
          value={kpis ? `£${kpis.avgEbitda.toFixed(1)}m` : "£0.0m"}
          change={{
            value: "-5%",
            type: "decrease",
            label: "vs last week"
          }}
          icon={<PoundSterling />}
          iconBgColor="bg-warning"
        />
        
        <KPICard
          title="Active Brokers"
          value={kpis?.activeBrokers || 0}
          change={{
            value: "All systems online",
            type: "neutral",
            label: ""
          }}
          icon={<Users />}
          iconBgColor="bg-secondary"
        />
      </div>

      {/* Scraping Status Section */}
      <ScrapingStatus />

      {/* Recent Listings Table */}
      <ListingTable limit={10} />

      {/* Quick Actions */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center p-6 h-auto bg-primary/5 hover:bg-primary/10 border-primary/20"
              onClick={() => handleQuickAction('manualScrape')}
            >
              <Search className="text-primary text-2xl mb-2 w-8 h-8" />
              <span className="text-sm font-medium text-primary">Manual Scrape</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center p-6 h-auto bg-success/5 hover:bg-success/10 border-success/20"
              onClick={() => handleQuickAction('exportData')}
            >
              <FileSpreadsheet className="text-success text-2xl mb-2 w-8 h-8" />
              <span className="text-sm font-medium text-success">Export Excel</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center p-6 h-auto bg-warning/5 hover:bg-warning/10 border-warning/20"
              onClick={() => handleQuickAction('manageBrokers')}
            >
              <Settings className="text-warning text-2xl mb-2 w-8 h-8" />
              <span className="text-sm font-medium text-warning">Manage Brokers</span>
            </Button>
            
            <Button
              variant="outline" 
              className="flex flex-col items-center justify-center p-6 h-auto bg-secondary/5 hover:bg-secondary/10 border-secondary/20"
              onClick={() => handleQuickAction('viewReports')}
            >
              <BarChart3 className="text-secondary text-2xl mb-2 w-8 h-8" />
              <span className="text-sm font-medium text-secondary">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
