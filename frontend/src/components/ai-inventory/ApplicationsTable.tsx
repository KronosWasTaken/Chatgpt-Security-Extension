import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getRiskBadgeClass, formatNumber } from "@/data/utils";
import { Search, Filter, ChevronDown, ChevronRight, Eye, AlertTriangle } from "lucide-react";

interface ApplicationsTableProps {
  applications: any[];
  onItemClick: (itemId: string) => void;
  activeFilter?: string | null;
}

export function ApplicationsTable({ applications, onItemClick, activeFilter }: ApplicationsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [blockedExpanded, setBlockedExpanded] = useState(false);

  // Filter and search logic
  const filteredApplications = applications.filter(app => {
    // Calculate risk level dynamically
    const riskScore = app.status === 'Unsanctioned' ? 75 : Math.min(60, Math.max(20, app.avgDailyInteractions / 100));
    const riskLevel = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';
    
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status.toLowerCase() === statusFilter;
    const matchesRisk = riskFilter === "all" || riskLevel === riskFilter;
    const matchesVendor = vendorFilter === "all" || app.vendor === vendorFilter;
    const matchesActiveFilter = !activeFilter || 
      (activeFilter === 'unsanctioned' && app.status === 'Unsanctioned') ||
      (activeFilter === 'high-risk' && riskLevel === 'high');

    return matchesSearch && matchesStatus && matchesRisk && matchesVendor && matchesActiveFilter;
  });

  // Separate and order applications by status (unsanctioned first, then permitted)
  const unsanctionedApps = filteredApplications.filter(app => app.status === 'Unsanctioned');
  const permittedApps = filteredApplications.filter(app => app.status === 'Permitted');
  const blockedApps = filteredApplications.filter(app => app.status === 'Blocked');
  
  // Combine unsanctioned and permitted for main table display
  const mainTableApps = [...unsanctionedApps, ...permittedApps];

  // Get unique vendors for filter
  const vendors = [...new Set(applications.map(app => app.vendor))].sort();

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="px-6 py-4 bg-muted/30 border-b">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-subtext" />
            <Input
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="permitted">Permitted</SelectItem>
              <SelectItem value="unsanctioned">Unsanctioned</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>

          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map(vendor => (
                <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Applications Table */}
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border-color">
            <TableHead className="text-subtext font-medium">Status</TableHead>
            <TableHead className="text-subtext font-medium">Application</TableHead>
            <TableHead className="text-subtext font-medium">Active Users</TableHead>
            <TableHead className="text-subtext font-medium">Interactions/Day</TableHead>
            <TableHead className="text-subtext font-medium">Integrations</TableHead>
            <TableHead className="text-subtext font-medium">Risk Assessment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mainTableApps.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-subtext">
                No applications found
              </TableCell>
            </TableRow>
          ) : (
            mainTableApps.map((app) => (
              <TableRow 
                key={app.id} 
                className={`hover:bg-app-bg cursor-pointer border-b border-border-color/50 ${app.status === 'Unsanctioned' ? 'bg-risk-medium/5' : ''}`}
                onClick={() => onItemClick(app.id)}
              >
                <TableCell className="py-3">
                  {app.status === 'Permitted' ? (
                    <Badge className="bg-risk-low text-white">Permitted</Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-subtext text-white">Unsanctioned</Badge>
                      <Badge className="bg-cybercept-blue text-white text-xs px-2 py-0.5">New</Badge>
                    </div>
                  )}
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${
                      app.status === 'Unsanctioned' ? 'bg-risk-medium/10' : 'bg-cybercept-blue/10'
                    }`}>
                      <span className={`text-xs font-semibold ${
                        app.status === 'Unsanctioned' ? 'text-risk-medium' : 'text-cybercept-blue'
                      }`}>
                        {app.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-heading-text">{app.name}</div>
                      <div className="text-sm text-subtext">{app.vendor}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-body-text">{formatNumber(app.users)}</TableCell>
                <TableCell className="text-body-text">{formatNumber(app.avgDailyInteractions)}</TableCell>
                <TableCell className="text-body-text">{app.integrations?.length || 0}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {(() => {
                      // Calculate risk level dynamically
                      const riskScore = app.status === 'Unsanctioned' ? 75 : Math.min(60, Math.max(20, app.avgDailyInteractions / 100));
                      const riskLevel = riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low';
                      return <Badge className={getRiskBadgeClass(riskLevel)}>{riskLevel}</Badge>;
                    })()}
                    {app.status === 'Unsanctioned' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs px-2 py-1 h-6 border-cybercept-blue text-cybercept-blue hover:bg-cybercept-blue hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to AI Control Center for action
                          window.location.href = `/client/ai-control?client=${app.clientId || 'acme-health'}`;
                        }}
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Blocked Applications Collapsible Section */}
      {blockedApps.length > 0 && (
        <div className="px-6">
          <Collapsible open={blockedExpanded} onOpenChange={setBlockedExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center justify-between w-full p-4 bg-risk-high/5 border border-risk-high/20 rounded-lg hover:bg-risk-high/10">
                <span className="text-sm font-semibold text-heading-text flex items-center gap-2">
                  <div className="w-3 h-3 bg-risk-high rounded-full"></div>
                  Blocked Applications ({blockedApps.length})
                </span>
                {blockedExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-2">
                {blockedApps.map((app) => (
                  <div 
                    key={app.id}
                    className="flex justify-between items-center p-3 rounded-md bg-risk-high/5 border border-risk-high/10 cursor-pointer hover:bg-risk-high/10"
                    onClick={() => onItemClick(app.id)}
                  >
                    <div>
                      <span className="font-medium text-heading-text">{app.name}</span>
                      <span className="text-subtext ml-2">({app.vendor})</span>
                    </div>
                    <div className="text-xs text-subtext">
                      Blocked • Security concerns
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Empty State */}
      {filteredApplications.length === 0 && (
        <div className="text-center py-12">
          <div className="text-subtext">
             No applications found matching your criteria
          </div>
        </div>
      )}
    </div>
  );
}