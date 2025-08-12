import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ScrapingStatus {
  isRunning: boolean;
  currentBroker?: string;
  progress: { completed: number; total: number };
  lastRun?: string;
}

interface ScrapingLog {
  id: string;
  brokerId: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  errorMessage?: string;
  listingsFound: number;
  newListings: number;
  broker?: {
    name: string;
  };
}

export default function Scraping() {
  const [selectedBroker, setSelectedBroker] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: scrapingStatus } = useQuery<ScrapingStatus>({
    queryKey: ["/api/scraping/status"],
    refetchInterval: 2000, // Refresh every 2 seconds when scraping
  });

  const { data: scrapingLogs = [], isLoading } = useQuery<ScrapingLog[]>({
    queryKey: ["/api/scraping/logs", selectedBroker],
  });

  const { data: brokers = [] } = useQuery({
    queryKey: ["/api/brokers"],
  });

  const startScrapingMutation = useMutation({
    mutationFn: async (brokerId?: string) => {
      return apiRequest("POST", "/api/scraping/start", brokerId ? { brokerId } : {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Scraping started successfully",
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      running: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800", 
      failed: "bg-red-100 text-red-800"
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDuration = (startedAt: string, completedAt?: string) => {
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const filteredLogs = selectedBroker === "all" 
    ? scrapingLogs 
    : scrapingLogs.filter(log => log.brokerId === selectedBroker);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Scraping Management</h2>
          <p className="text-sm text-gray-600">
            Monitor and control broker scraping operations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => startScrapingMutation.mutate()}
            disabled={startScrapingMutation.isPending || scrapingStatus?.isRunning}
          >
            <Play className="w-4 h-4 mr-2" />
            Start All Brokers
          </Button>
        </div>
      </div>

      {/* Current Status Card */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className={`w-5 h-5 ${scrapingStatus?.isRunning ? 'animate-spin text-blue-600' : 'text-gray-400'}`} />
            <span>Scraping Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {scrapingStatus?.isRunning ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  Scraping in progress...
                </span>
                <Badge className="bg-blue-100 text-blue-800">
                  Active
                </Badge>
              </div>
              
              {scrapingStatus.currentBroker && (
                <p className="text-sm text-gray-600">
                  Currently scraping: <span className="font-medium">{scrapingStatus.currentBroker}</span>
                </p>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{scrapingStatus.progress.completed} / {scrapingStatus.progress.total}</span>
                </div>
                <Progress 
                  value={(scrapingStatus.progress.completed / scrapingStatus.progress.total) * 100} 
                  className="w-full"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No scraping operations currently running</p>
              {scrapingStatus?.lastRun && (
                <p className="text-xs text-gray-400 mt-1">
                  Last run: {formatDateTime(scrapingStatus.lastRun)}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scraping Logs */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Scraping Logs</CardTitle>
            <Select value={selectedBroker} onValueChange={setSelectedBroker}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brokers</SelectItem>
                {brokers.map((broker: any) => (
                  <SelectItem key={broker.id} value={broker.id}>
                    {broker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Broker</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Found</TableHead>
                  <TableHead>New</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No scraping logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(log.status)}
                          <span>{log.broker?.name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDateTime(log.startedAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getDuration(log.startedAt, log.completedAt)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.listingsFound}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-green-600">
                        {log.newListings}
                      </TableCell>
                      <TableCell className="text-sm text-red-600 max-w-xs truncate">
                        {log.errorMessage || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
