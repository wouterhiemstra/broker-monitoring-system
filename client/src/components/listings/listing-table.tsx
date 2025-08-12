import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Phone, MoreHorizontal, Filter, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusColors, listingStatuses } from "@/lib/brokers";
import { apiRequest } from "@/lib/queryClient";

interface Listing {
  id: string;
  dateAdded: string;
  link: string;
  listingId: string;
  title: string;
  isActive: boolean;
  status: string;
  revenue?: number;
  ebitda?: number;
  ftes?: number;
  broker: {
    id: string;
    name: string;
    tier: number;
  };
}

interface ListingTableProps {
  showFilters?: boolean;
  limit?: number;
}

export function ListingTable({ showFilters = true, limit }: ListingTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("All Statuses");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = limit || 50;

  const queryClient = useQueryClient();

  const { data: listings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings", { status: statusFilter, search: searchQuery, offset: page * pageSize, limit: pageSize }],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/listings/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
    },
  });

  const handleStatusChange = (listingId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: listingId, status: newStatus });
  };

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
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "";
    return `£${amount.toFixed(2)}m`;
  };

  const filteredListings = listings.filter(listing => {
    const matchesStatus = statusFilter === "All Statuses" || listing.status === statusFilter;
    const matchesSearch = !searchQuery || 
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.broker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.listingId.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-200">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Recent Listings
          </CardTitle>
          {showFilters && (
            <div className="flex items-center space-x-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Statuses">All Statuses</SelectItem>
                  {listingStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Button variant="ghost" size="sm">
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 border-b border-gray-200">
              <TableRow>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Listing
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Broker
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  EBITDA
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-200">
              {filteredListings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No listings found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredListings.map((listing) => (
                  <TableRow key={listing.id} className="hover:bg-gray-50">
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 max-w-md truncate">
                          {listing.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {listing.listingId} • Added: {formatDate(listing.dateAdded)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm text-gray-900">{listing.broker.name}</div>
                      <div className="text-xs text-gray-500">Tier {listing.broker.tier}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(listing.revenue)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(listing.ebitda)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Select 
                        value={listing.status} 
                        onValueChange={(value) => handleStatusChange(listing.id, value)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <Badge 
                            className={cn(
                              "text-xs font-semibold rounded-full border-0",
                              statusColors[listing.status as keyof typeof statusColors]
                            )}
                          >
                            {listing.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {listingStatuses.map(status => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-medium space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(listing.link, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Phone className="w-4 h-4 mr-1" />
                        Contact
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!limit && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to{" "}
              <span className="font-medium">{Math.min(pageSize, filteredListings.length)}</span> of{" "}
              <span className="font-medium">{filteredListings.length}</span> results
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button 
                variant={page === 0 ? "default" : "outline"} 
                size="sm"
                onClick={() => setPage(0)}
              >
                1
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
