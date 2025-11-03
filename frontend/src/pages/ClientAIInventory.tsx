import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useClients, useClient, useAIInventory } from "@/hooks/useApi";
import { getInventoryDetail } from "@/data/inventoryDetails";
import { ApplicationsTable } from "@/components/ai-inventory/ApplicationsTable";
import { AgentsTable } from "@/components/ai-inventory/AgentsTable";
import { InventoryDetailDrawer } from "@/components/ai-inventory/InventoryDetailDrawer";
import { getRiskLevel, getRiskBadgeClass, formatNumber } from "@/data/utils";
import { Shield, AlertTriangle, Users, Bot, Eye, Building2, TrendingUp, TrendingDown, AlertCircle, RefreshCw } from "lucide-react";

export default function ClientAIInventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedClientId, setSelectedClientId] = useState(searchParams.get("id") || "");
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // API hooks
  const { data: clients, isLoading: clientsLoading, error: clientsError, refetch: refetchClients } = useClients();
  const { data: selectedClient, isLoading: clientLoading, error: clientError, refetch: refetchClient } = useClient(selectedClientId);
  const { data: aiInventory, isLoading: inventoryLoading, error: inventoryError, refetch: refetchInventory } = useAIInventory();

  // Error states
  const hasError = clientsError || clientError || inventoryError;
  const isLoading = clientsLoading || clientLoading || inventoryLoading;

  // Get inventory for the selected client from API data
  const inventory = aiInventory?.find(client => client.clientId === selectedClientId)?.items || [];
  const selectedInventoryDetail = selectedInventoryItem ? getInventoryDetail(selectedInventoryItem) : null;

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

  const handleRetry = () => {
    refetchClients();
    refetchClient();
    refetchInventory();
  };

  const handleInventoryItemClick = (itemId: string) => {
    setSelectedInventoryItem(itemId);
    setDrawerOpen(true);
  };

  const clientOptions = clients?.map(client => ({
    value: client.id,
    label: client.name
  })) || [];

  // Filter inventory based on active filter
  const filteredInventory = activeFilter 
    ? inventory.filter(item => item.type === activeFilter)
    : inventory;

  // Separate applications and agents
  const applications = filteredInventory.filter(item => item.type === "Application");
  const agents = filteredInventory.filter(item => item.type === "Agent");

  // Calculate KPIs
  const applicationsMonitored = applications.length;
  const unsanctionedApps = applications.filter(app => app.status === "Unsanctioned").length;
  const agentsDeployed = agents.length;
  const highRiskActions = 12; // Mock data - would come from agent monitoring
  const overallRiskScore = selectedClient?.risk_score || 0;

  // Error state
  if (hasError) {
    return (
      <AppLayout 
        headerTitle="AI Inventory"
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
                <p className="font-semibold">Failed to load inventory data</p>
                <p className="text-sm">
                  {clientsError && "Failed to load clients list. "}
                  {clientError && "Failed to load client details. "}
                  {inventoryError && "Failed to load AI inventory. "}
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
        headerTitle="AI Inventory"
        headerActions={<Skeleton className="h-10 w-64" />}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // No client found
  if (!selectedClient) {
    return (
      <AppLayout 
        headerTitle="AI Inventory"
        headerActions={
          <Button onClick={handleRetry} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-subtext mx-auto" />
            <div>
              <p className="text-lg font-semibold text-heading-text">Client not found</p>
              <p className="text-subtext">The selected client could not be found or you don't have access to it.</p>
            </div>
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      headerTitle="AI Inventory"
      headerActions={
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select client..." />
          </SelectTrigger>
          <SelectContent>
            {clientOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-elegant bg-gradient-brand-subtle">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-subtext">
                  Applications Monitored
                </CardTitle>
                <Building2 className="w-4 h-4 text-cybercept-blue" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-heading-text">
                {formatNumber(applicationsMonitored)}
              </div>
              <div className="text-sm text-subtext mt-1">
                {unsanctionedApps} unsanctioned
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elegant bg-gradient-brand-subtle">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-subtext">
                  Agents Deployed
                </CardTitle>
                <Bot className="w-4 h-4 text-cybercept-teal" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-heading-text">
                {formatNumber(agentsDeployed)}
              </div>
              <div className="text-sm text-subtext mt-1">
                Active monitoring
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elegant bg-gradient-brand-subtle">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-subtext">
                  Risk Assessment
                </CardTitle>
                <Shield className="w-4 h-4 text-risk-high" />
              </div>
            </CardHeader>
            <CardContent>
              <Badge className={`${getRiskBadgeClass(getRiskLevel(overallRiskScore))} text-sm font-semibold`}>
                {getRiskLevel(overallRiskScore)}
              </Badge>
              <div className="text-sm text-subtext mt-1">
                {highRiskActions} flagged actions
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elegant bg-gradient-brand-subtle">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-subtext">
                  Total Users
                </CardTitle>
                <Users className="w-4 h-4 text-cybercept-blue" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-heading-text">
                {formatNumber(selectedClient.interactions_monitored)}
              </div>
              <div className="text-sm text-subtext mt-1">
                Daily interactions
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        <div className="flex gap-4">
          <Button
            variant={activeFilter === null ? "default" : "outline"}
            onClick={() => setActiveFilter(null)}
            className="bg-white/5 border-white/10 text-body-text hover:bg-white/10 hover:text-heading-text"
          >
            All Items
          </Button>
          <Button
            variant={activeFilter === "Application" ? "default" : "outline"}
            onClick={() => setActiveFilter("Application")}
            className="bg-white/5 border-white/10 text-body-text hover:bg-white/10 hover:text-heading-text"
          >
            Applications
          </Button>
          <Button
            variant={activeFilter === "Agent" ? "default" : "outline"}
            onClick={() => setActiveFilter("Agent")}
            className="bg-white/5 border-white/10 text-body-text hover:bg-white/10 hover:text-heading-text"
          >
            Agents
          </Button>
        </div>

        {/* Applications Table */}
        {applications.length > 0 && (
          <Card className="border-0 shadow-elegant">
            <CardHeader>
              <CardTitle className="text-heading-text flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Applications ({applications.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ApplicationsTable 
                applications={applications}
                onItemClick={handleInventoryItemClick}
              />
            </CardContent>
          </Card>
        )}

        {/* Agents Table */}
        {agents.length > 0 && (
          <Card className="border-0 shadow-elegant">
            <CardHeader>
              <CardTitle className="text-heading-text flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Agents ({agents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AgentsTable 
                agents={agents}
                onAgentClick={handleInventoryItemClick}
              />
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {filteredInventory.length === 0 && (
          <Card className="border-0 shadow-elegant">
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <Eye className="w-12 h-12 text-subtext mx-auto" />
                <div>
                  <p className="text-lg font-semibold text-heading-text">No inventory items found</p>
                  <p className="text-subtext">
                    {activeFilter 
                      ? `No ${activeFilter.toLowerCase()}s found for this client.`
                      : "This client has no AI applications or agents in their inventory."
                    }
                  </p>
                </div>
                {activeFilter && (
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveFilter(null)}
                    className="bg-white/5 border-white/10 text-body-text hover:bg-white/10 hover:text-heading-text"
                  >
                    View All Items
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Detail Drawer */}
        <InventoryDetailDrawer
          item={selectedInventoryDetail}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      </div>
    </AppLayout>
  );
}