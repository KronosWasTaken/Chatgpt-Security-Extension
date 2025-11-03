import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useClients, useClient, useAIInventory, useClientDashboard, useAlerts } from "@/hooks/useApi";
// Removed mock data imports - using API data instead
import { InventoryDetailDialog } from "@/components/InventoryDetailDialog";
import { InventoryList } from "@/components/client/InventoryList";
import { AlertsRibbon } from "@/components/alerts-ribbon";
import { AlertsFeed } from "@/components/alerts-feed";
import { AlertFamily } from "@/data/alerts";
import { getRiskLevel, getRiskBadgeClass, formatNumber, formatDelta, getStatusPillClass, getIntegrationColor, formatDate } from "@/data/utils";
import { TrendingUp, Users, Shield, CheckCircle, Search, TrendingDown, AlertCircle, RefreshCw } from "lucide-react";

const Client = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState(searchParams.get("id") || "");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState<string>("all");
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<string>("all");
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string | null>(null);
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [alertFamilyFilter, setAlertFamilyFilter] = useState<AlertFamily | null>(null);

  // API hooks
  const { data: clients, isLoading: clientsLoading, error: clientsError, refetch: refetchClients } = useClients();
  const { data: selectedClient, isLoading: clientLoading, error: clientError, refetch: refetchClient } = useClient(selectedClientId);
  const { data: aiInventory, isLoading: inventoryLoading, error: inventoryError, refetch: refetchInventory } = useAIInventory();
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useClientDashboard(selectedClientId);
  const { data: alerts = [], isLoading: alertsLoading, error: alertsError, refetch: refetchAlerts } = useAlerts({ limit: 100 });

  // Get inventory for the selected client from API data and map to expected format
  const rawInventory = aiInventory?.find(client => client.clientId === selectedClientId)?.items || [];
  const inventory = rawInventory.map(item => ({
    id: item.id,
    type: item.type as 'Application' | 'Agent',
    name: item.name,
    vendor: item.vendor,
    users: item.active_users,
    avgDailyInteractions: item.avgDailyInteractions || item.avg_daily_interactions || 0,
    status: (item.status === 'Blocked' ? 'Unsanctioned' : 'Permitted') as 'Permitted' | 'Unsanctioned',
    integrations: item.integrations || []
  }));
  
  // Mock data for components that don't have backend endpoints yet - will be replaced with API calls
  const frameworks = []; // TODO: Replace with API call
  const engagement = null; // TODO: Replace with API call
  const trendingData = null; // TODO: Replace with API call
  const selectedInventoryDetail = null; // TODO: Replace with API call

  // Error states
  const hasError = clientsError || clientError || inventoryError || dashboardError || alertsError;
  const isLoading = clientsLoading || clientLoading || inventoryLoading || dashboardLoading || alertsLoading;

  useEffect(() => {
    if (selectedClientId !== searchParams.get("id")) {
      setSearchParams({ id: selectedClientId });
    }
  }, [selectedClientId, searchParams, setSearchParams]);

  // Auto-select first client if no client ID is provided
  useEffect(() => {
    if (!selectedClientId && clients && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, [selectedClientId, clients]);

  // Ensure selected client is valid; if not, auto-correct to first available
  useEffect(() => {
    if (clients && clients.length > 0 && selectedClientId) {
      const exists = clients.some(c => c.id === selectedClientId);
      if (!exists) {
        setSelectedClientId(clients[0].id);
      }
    }
  }, [clients, selectedClientId]);

  const clientOptions = clients?.map(client => ({
    value: client.id,
    label: client.name
  })) || [];

  const handleInventoryItemClick = (itemId: string) => {
    setSelectedInventoryItem(itemId);
    setInventoryDialogOpen(true);
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                         item.vendor.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesType = inventoryTypeFilter === "all" || item.type === inventoryTypeFilter;
    const matchesStatus = inventoryStatusFilter === "all" || item.status === inventoryStatusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleRetry = () => {
    refetchClients();
    refetchClient();
    refetchInventory();
    refetchDashboard();
    refetchAlerts();
  };

  const kpiCards = selectedClient ? [
    {
      title: "Applications Monitored",
      value: selectedClient.apps_monitored,
      icon: TrendingUp,
      description: "AI applications tracked for this client",
      trend: selectedClient.apps_added_7d || 0,
      trendType: "number" as const
    },
    {
      title: "Interactions Monitored",
      value: selectedClient.interactions_monitored,
      icon: Users,
      description: "Daily AI interactions monitored",
      trend: selectedClient.interactions_pct_change_7d || 0,
      trendType: "percentage" as const
    },
    {
      title: "Agents Deployed",
      value: selectedClient.agents_deployed,
      icon: Users,
      description: "Active AI agents in use",
      trend: selectedClient.agents_deployed_change_7d || 0,
      trendType: "number" as const
    },
    {
      title: "AI Risk Assessment",
      value: getRiskLevel(selectedClient.risk_score),
      icon: Shield,
      description: "Current risk level assessment",
      isBadge: true
    },
    {
      title: "Compliance Coverage",
      value: `${selectedClient.compliance_coverage}%`,
      icon: CheckCircle,
      description: "Overall compliance framework coverage",
      trend: 0,
      trendType: "percentage" as const
    }
  ] : [];

  // Error state
  if (hasError) {
    return (
      <AppLayout 
        headerTitle="Single Client View"
        headerActions={
          <Button onClick={handleRetry} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        }
      >
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Failed to load client data</p>
                <p className="text-sm">
                  {clientsError && "Failed to load clients list. "}
                  {clientError && "Failed to load client details. "}
                  {inventoryError && "Failed to load AI inventory. "}
                  {dashboardError && "Failed to load dashboard data. "}
                </p>
                <Button onClick={handleRetry} variant="outline" size="sm" className="mt-2">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <AppLayout 
        headerTitle="Single Client View"
        headerActions={<Skeleton className="h-10 w-64" />}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="border-0 shadow-elegant">
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-6 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-elegant">
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-elegant">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  // No data state
  if (!selectedClient) {
    return (
      <AppLayout 
        headerTitle="Single Client View"
        headerActions={
          <Button onClick={handleRetry} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        }
      >
        <div className="space-y-6">
          <Card className="border-0 shadow-elegant">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No client data found</h3>
                  <p className="text-muted-foreground">
                    {selectedClientId ? 
                      `No data available for client ID: ${selectedClientId}` : 
                      "Please select a client to view details."
                    }
                  </p>
                </div>
                <Button onClick={handleRetry} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }


  return (
    <AppLayout 
      headerTitle="Single Client View"
      headerActions={
        <Combobox
          options={clientOptions}
          value={selectedClientId}
          onValueChange={setSelectedClientId}
          placeholder="Select client..."
          className="w-64"
        />
      }
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            
            return (
              <Card key={card.title} className="border-0 shadow-elegant bg-gradient-brand-subtle">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs font-medium text-subtext">
                      {card.title}
                    </CardDescription>
                    <Icon className="w-4 h-4 text-cybercept-blue" />
                  </div>
                </CardHeader>
                
                <CardContent>
                  {card.isBadge ? (
                    <Badge className={`${getRiskBadgeClass(card.value as any)} text-sm font-semibold`}>
                      {card.value}
                    </Badge>
                  ) : (
                    <div className="text-xl font-bold text-heading-text">
                      {typeof card.value === 'number' ? formatNumber(card.value) : card.value}
                    </div>
                  )}
                  
                  {card.trend !== undefined && card.trend !== 0 && (
                    <div className={`flex items-center text-sm font-medium mt-1 ${
                      card.trend > 0 ? 'text-cybercept-teal' : 'text-risk-high'
                    }`}>
                      {card.trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {card.trendType === 'number' ? (
                        `${card.trend > 0 ? '+' : ''}${card.trend} vs last 7d`
                      ) : (
                        `${card.trend > 0 ? '+' : ''}${card.trend}% vs last 7d`
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Alerts */}
        <AlertsFeed 
          clientId={selectedClientId}
          familyFilter={alertFamilyFilter}
          alerts={alerts as any}
          clients={clients as any}
        />

        {/* Middle Row - Compliance Progress & AI Inventory */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compliance Progress */}
          <Card className="border-0 shadow-elegant">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-heading-text">Compliance Progress</CardTitle>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/client/compliance?id=${selectedClientId}`)}
                  className="bg-white/5 border-white/10 text-body-text hover:bg-white/10 hover:text-heading-text transition-all duration-200 font-medium"
                >
                  Details
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {frameworks.map((framework) => (
                <Dialog key={framework.id}>
                  <DialogTrigger asChild>
                    <div className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-heading-text">{framework.name}</h4>
                        <span className="text-sm text-subtext">{framework.coveragePct}%</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-text">Coverage</span>
                          <span className="font-medium text-cybercept-blue">{framework.coveragePct}%</span>
                        </div>
                        <Progress value={framework.coveragePct} className="h-2" />
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-text">Evidence</span>
                          <span className="font-medium text-cybercept-teal">{framework.evidencePct}%</span>
                        </div>
                        <Progress value={framework.evidencePct} className="h-2" />
                      </div>
                    </div>
                  </DialogTrigger>
                  
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{framework.name}</DialogTitle>
                      <DialogDescription>{framework.description}</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-body-text">Coverage</p>
                          <p className="text-2xl font-bold text-cybercept-blue">{framework.coveragePct}%</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-body-text">Evidence</p>
                          <p className="text-2xl font-bold text-cybercept-teal">{framework.evidencePct}%</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-body-text mb-1">Last Updated</p>
                        <p className="text-subtext">{formatDate(framework.lastUpdated)}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-body-text mb-2">Sample Controls</p>
                        <ul className="text-sm text-subtext space-y-1">
                          <li>• AI system documentation and governance</li>
                          <li>• Risk assessment and mitigation procedures</li>
                          <li>• Data privacy and security controls</li>
                          <li>• Regular compliance audits and reviews</li>
                        </ul>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </CardContent>
          </Card>

          {/* AI Inventory */}
          <Card className="border-0 shadow-elegant">
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <CardTitle className="text-heading-text">AI Inventory</CardTitle>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/client/ai-inventory?id=${selectedClientId}`)}
                  className="bg-white/5 border-white/10 text-body-text hover:bg-white/10 hover:text-heading-text transition-all duration-200 font-medium"
                >
                  Details
                </Button>
              </div>
              
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-subtext" />
                  <Input
                    placeholder="Search by name or vendor..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={inventoryTypeFilter} onValueChange={setInventoryTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Application">Apps</SelectItem>
                    <SelectItem value="Agent">Agents</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={inventoryStatusFilter} onValueChange={setInventoryStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Permitted">Permitted</SelectItem>
                    <SelectItem value="Unsanctioned">Unsanctioned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <InventoryList 
                items={filteredInventory} 
                onItemClick={handleInventoryItemClick}
              />
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - Engagement Stats */}
        {engagement && (
          <Card className="border-0 shadow-elegant lg:col-span-3 mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-heading-text">AI Engagement</CardTitle>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/client/ai-engagement?id=${selectedClientId}`)}
                  className="bg-white/5 border-white/10 text-body-text hover:bg-white/10 hover:text-heading-text transition-all duration-200 font-medium"
                >
                  Details
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Applications */}
                <div className="p-4 border border-border rounded-lg bg-card/30">
                  <h3 className="text-lg font-semibold text-heading-text mb-4">Top 5 AI Applications</h3>
                  <p className="text-sm text-muted-foreground mb-4">Ranked by daily interactions</p>
                  
                  <div className="space-y-3">
                    {engagement.topAppsDaily.map((app, index) => {
                  const delta = formatDelta(app.delta7dPct);
                  
                  return (
                    <div key={app.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-cybercept-blue text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-heading-text">{app.name}</p>
                          <p className="text-sm text-subtext">{app.vendor}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold text-body-text">{formatNumber(app.avgDailyInteractions)}</p>
                        <p className={`text-xs ${delta.className}`}>{delta.text}</p>
                      </div>
                    </div>
                    );
                  })}
                  </div>
                </div>

                {/* Top Agents */}
                <div className="p-4 border border-border rounded-lg bg-card/30">
                  <h3 className="text-lg font-semibold text-heading-text mb-4">Top 5 AI Agents</h3>
                  <p className="text-sm text-muted-foreground mb-4">Ranked by daily interactions</p>
                  
                  <div className="space-y-3">
                     {engagement.topAgentsDaily.map((agent, index) => {
                      const delta = formatDelta(agent.delta7dPct);
                      
                      return (
                        <div key={agent.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-cybercept-teal text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-heading-text">{agent.name}</p>
                              <p className="text-sm text-subtext">{agent.vendor}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-semibold text-body-text">{formatNumber(agent.avgDailyInteractions)}</p>
                            <p className={`text-xs ${delta.className}`}>{delta.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Users */}
                <div className="p-4 border border-border rounded-lg bg-card/30">
                  <h3 className="text-lg font-semibold text-heading-text mb-4">Top 5 AI Users</h3>
                  <p className="text-sm text-muted-foreground mb-4">Ranked by daily interactions</p>
                  
                  <div className="space-y-3">
                    {engagement.topUsersDaily.map((user, index) => {
                      const delta = formatDelta(user.delta7dPct);
                      
                      return (
                        <div key={user.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-gradient-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-heading-text">{user.name}</p>
                              <p className="text-sm text-subtext">{user.department}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-semibold text-body-text">{user.avgDailyInteractions}</p>
                            <p className={`text-xs ${delta.className}`}>{delta.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <InventoryDetailDialog
          item={selectedInventoryDetail}
          open={inventoryDialogOpen}
          onOpenChange={setInventoryDialogOpen}
        />
      </div>
    </AppLayout>
  );
};

export default Client;