import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { clients } from "@/data/clients";
import { getInventoryForClient } from "@/data/inventory";
import { getInventoryDetail } from "@/data/inventoryDetails";
import { ApplicationsTable } from "@/components/ai-inventory/ApplicationsTable";
import { AgentsTable } from "@/components/ai-inventory/AgentsTable";
import { InventoryDetailDrawer } from "@/components/ai-inventory/InventoryDetailDrawer";
import { getRiskLevel, getRiskBadgeClass, formatNumber } from "@/data/utils";
import { Shield, AlertTriangle, Users, Bot, Eye, Building2, TrendingUp, TrendingDown } from "lucide-react";
import { TokenManager, apiClient } from "@/services/api";

export default function ClientAIInventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedClientId, setSelectedClientId] = useState(searchParams.get("id") || "acme-health");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const [apiApps, setApiApps] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Load from API, fallback to mock
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        if (!TokenManager.getToken()) {
          await new Promise((r) => setTimeout(r, 250));
        }
        const backoff = async <T,>(fn: () => Promise<T>, attempts = 1): Promise<T> => {
          try { return await fn(); } catch (e: any) {
            if (attempts > 0 && (/429/.test(String(e?.message)) || /Network/i.test(String(e?.message)))) {
              await new Promise((r) => setTimeout(r, 800));
              return backoff(fn, attempts - 1);
            }
            throw e;
          }
        };
        // Real API call for per-client inventory
        const items = await backoff(() => apiClient.getClientInventory(selectedClientId));
        if (!cancelled) setApiApps(items);
      } catch (e: any) {
        console.warn('ClientAIInventory: API fetch failed, falling back to mock:', e?.message);
        if (!cancelled) {
          setApiApps(null);
          setError(null); // Do not show error if mock is available
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true };
  }, [selectedClientId, retryCount]);

  // Separate applications and agents
  const applications = inventory.filter(item => item.type === 'Application');
  const agents = inventory.filter(item => item.type === 'Agent');

  // Calculate KPIs
  const applicationsMonitored = applications.length;
  const unsanctionedApps = applications.filter(app => app.status === 'Unsanctioned').length;
  const agentsDeployed = agents.reduce((sum, agent) => sum + 1, 0); // In real app, this would be actual count
  const highRiskActions = 12; // Mock data - would come from agent monitoring
  const overallRiskScore = selectedClient?.riskScore || 0;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // wait briefly for token propagation on first load or route change
        if (!TokenManager.getToken()) {
          await new Promise((r) => setTimeout(r, 250));
        }
        // simulate minimal backoff to align with backend readiness
        await new Promise((r) => setTimeout(r, 200));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load inventory');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true };
  }, [selectedClientId, retryCount]);

  useEffect(() => {
    if (selectedClientId !== searchParams.get("id")) {
      setSearchParams({ id: selectedClientId });
    }
  }, [selectedClientId, searchParams, setSearchParams]);

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.name
  }));

  const inventory = apiApps && apiApps.length > 0 ? apiApps : getInventoryForClient(selectedClientId);
  const selectedInventoryDetail = selectedInventoryItem ? getInventoryDetail(selectedInventoryItem) : null;

  const handleItemClick = (itemId: string) => {
    setSelectedInventoryItem(itemId);
    setDrawerOpen(true);
  };

  const handleRetry = () => setRetryCount(c => c + 1);



  const kpiCards = [
    {
      id: "applications",
      title: "Applications Monitored",
      value: applicationsMonitored,
      icon: Eye,
      iconColor: "text-cybercept-blue",
      trend: "+12%",
      trendUp: true
    },
    {
      id: "unsanctioned",
      title: "Unsanctioned Applications",
      value: unsanctionedApps,
      icon: AlertTriangle,
      iconColor: unsanctionedApps > 0 ? "text-risk-medium" : "text-cybercept-teal",
      trend: "-3%",
      trendUp: false
    },
    {
      id: "agents",
      title: "Agents Deployed",
      value: agentsDeployed,
      icon: Bot,
      iconColor: "text-cybercept-teal",
      trend: "+8%",
      trendUp: true
    },
    {
      id: "high-risk",
      title: "High Risk Actions",
      value: highRiskActions,
      icon: Shield,
      iconColor: highRiskActions > 0 ? "text-risk-high" : "text-cybercept-teal",
      trend: "+25%",
      trendUp: true
    },
    {
      id: "risk-assessment",
      title: "AI Risk Assessment",
      value: getRiskLevel(overallRiskScore),
      icon: Shield,
      isBadge: true,
      iconColor: overallRiskScore > 70 ? "text-risk-high" : overallRiskScore > 40 ? "text-risk-medium" : "text-cybercept-teal",
      trend: "-5%",
      trendUp: false
    }
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToAdminActions = () => {
    const element = document.getElementById('admin-actions');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleKpiClick = (cardId: string) => {
    // Set filter based on KPI clicked
    if (cardId === 'unsanctioned') {
      setActiveFilter('unsanctioned');
    } else if (cardId === 'high-risk') {
      setActiveFilter('high-risk');
    } else {
      setActiveFilter(null);
    }
    // Scroll to relevant section
    if (cardId === 'agents' || cardId === 'high-risk') {
      scrollToSection('agents');
    } else {
      scrollToSection('applications');
    }
  };

  // Check if there are alerts to show
  const hasAlerts = unsanctionedApps > 0 || highRiskActions > 0;

  if (error && !apiApps) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-app-bg flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-heading-text mb-2">Error loading AI Inventory</h2>
            <p className="text-subtext mb-4">{error}</p>
            <Button onClick={handleRetry}>Retry</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-app-bg flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-heading-text mb-2">Error loading AI Inventory</h2>
            <p className="text-subtext mb-4">{error}</p>
            <Button onClick={handleRetry}>Retry</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-app-bg">
          <div className="bg-surface border-b border-border-color sticky top-0 z-40">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32 mt-2" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-40" />
                  <Skeleton className="h-10 w-48" />
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 space-y-8">
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="bg-surface border border-border-color">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Skeleton className="w-5 h-5" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-3 w-32 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8">
                <Card className="bg-surface border border-border-color">
                  <div className="px-6 py-4 border-b">
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <div className="p-6 space-y-4">
                    {[...Array(5)].map((_, j) => (
                      <Skeleton key={j} className="h-16 w-full" />
                    ))}
                  </div>
                </Card>
              </div>
              <div className="col-span-4">
                <Card className="bg-surface border border-border-color">
                  <div className="px-6 py-4 border-b">
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <div className="p-6 space-y-4">
                    {[...Array(3)].map((_, j) => (
                      <Skeleton key={j} className="h-16 w-full" />
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!selectedClient) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-app-bg flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-heading-text mb-2">Client not found</h2>
            <p className="text-subtext">Please select a valid client to view their AI inventory.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-app-bg">
        {/* Header Section */}
        <div className="bg-surface border-b border-border-color sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-heading-text">AI Inventory</h1>
                <p className="text-subtext text-sm mt-1">
                  {selectedClient?.name || "Select a client"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Alert Banner */}
          {hasAlerts && (
            <Alert 
              className="bg-risk-high/5 border-risk-high/20 text-risk-high cursor-pointer hover:bg-risk-high/10 transition-colors"
              onClick={scrollToAdminActions}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="font-medium">
                {unsanctionedApps > 0 && `${unsanctionedApps} unsanctioned application${unsanctionedApps > 1 ? 's' : ''} require${unsanctionedApps === 1 ? 's' : ''} review`}
                {unsanctionedApps > 0 && highRiskActions > 0 && ', '}
                {highRiskActions > 0 && `${highRiskActions} high-risk agent${highRiskActions > 1 ? 's' : ''} flagged`}
              </AlertDescription>
            </Alert>
          )}

          {/* KPI Tiles */}
          <div className="grid grid-cols-5 gap-4">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              const TrendIcon = card.trendUp ? TrendingUp : TrendingDown;
              
              return (
                <Card 
                  key={card.title} 
                  className={`bg-surface border border-border-color cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] ${card.id === 'risk-assessment' && overallRiskScore > 70 ? 'bg-risk-high/5 border-risk-high/20' : card.id === 'risk-assessment' && overallRiskScore > 40 ? 'bg-risk-medium/5 border-risk-medium/20' : card.id === 'risk-assessment' ? 'bg-risk-low/5 border-risk-low/20' : ''}`}
                  onClick={() => handleKpiClick(card.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-muted-foreground">
                        {card.title}
                      </div>
                      <Icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                    
                    {card.isBadge ? (
                      <div className="text-center my-4">
                        <Badge className={`${getRiskBadgeClass(card.value as any)} text-lg font-semibold px-4 py-1`}>
                          {card.value}
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-3xl font-bold text-heading-text my-4">
                        {formatNumber(card.value as number)}
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground">
                      {card.trendUp ? '↗' : '↘'} {card.trend} vs. last 7 days
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Main Content - 70/30 Split Layout */}
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* Left Column: AI Applications (70%) */}
            <div className="col-span-8 h-full" id="applications">
              <div className="bg-surface rounded-lg border border-border-color shadow-sm h-full">
                {/* Sticky Header */}
                <div className="sticky top-20 bg-surface border-b border-border-color px-6 py-4 rounded-t-lg z-30">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-heading-text">AI Applications</h2>
                  </div>
                </div>
                
                <div className="p-0">
                  <ApplicationsTable 
                    applications={applications}
                    onItemClick={handleItemClick}
                    activeFilter={activeFilter}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: AI Agents (30%) */}
            <div className="col-span-4 h-full" id="agents">
              <div className="bg-surface rounded-lg border border-border-color shadow-sm h-full">
                {/* Sticky Header */}
                <div className="sticky top-20 bg-surface border-b border-border-color px-6 py-4 rounded-t-lg z-30">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-heading-text">AI Agents</h2>
                  </div>
                </div>
                
                <div className="p-0">
                  <AgentsTable 
                    agents={agents}
                    onItemClick={handleItemClick}
                    activeFilter={activeFilter}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      <InventoryDetailDrawer
        item={selectedInventoryDetail}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </AppLayout>
  );
}