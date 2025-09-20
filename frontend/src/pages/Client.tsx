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
import { clients } from "@/data/clients";
import { getFrameworksForClient } from "@/data/frameworks";
import { getInventoryForClient } from "@/data/inventory";
import { getEngagementForClient } from "@/data/engagement";
import { getTrendingDataForClient } from "@/data/mockTrendingData";
import { getInventoryDetail } from "@/data/inventoryDetails";
import { InventoryDetailDialog } from "@/components/InventoryDetailDialog";
import { InventoryList } from "@/components/client/InventoryList";
import { AlertsRibbon } from "@/components/alerts-ribbon";
import { AlertsFeed } from "@/components/alerts-feed";
import { AlertFamily } from "@/data/alerts";
import { getRiskLevel, getRiskBadgeClass, formatNumber, formatDelta, getStatusPillClass, getIntegrationColor, formatDate } from "@/data/utils";
import { TrendingUp, Users, Shield, CheckCircle, Search, TrendingDown } from "lucide-react";

const Client = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState(searchParams.get("id") || "acme-health");
  const [isLoading, setIsLoading] = useState(true);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState<string>("all");
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<string>("all");
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string | null>(null);
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [alertFamilyFilter, setAlertFamilyFilter] = useState<AlertFamily | null>(null);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const frameworks = getFrameworksForClient(selectedClientId);
  const inventory = getInventoryForClient(selectedClientId);
  const engagement = getEngagementForClient(selectedClientId);
  const trendingData = getTrendingDataForClient(selectedClientId);
  const selectedInventoryDetail = selectedInventoryItem ? getInventoryDetail(selectedInventoryItem) : null;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [selectedClientId]);

  useEffect(() => {
    if (selectedClientId !== searchParams.get("id")) {
      setSearchParams({ id: selectedClientId });
    }
  }, [selectedClientId, searchParams, setSearchParams]);

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.name
  }));

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

  const kpiCards = selectedClient && trendingData ? [
    {
      title: "Applications Monitored",
      value: selectedClient.appsMonitored,
      icon: TrendingUp,
      description: "AI applications tracked for this client",
      trend: trendingData.appsMonitoredDelta,
      trendType: "number" as const
    },
    {
      title: "Interactions Monitored",
      value: selectedClient.interactionsMonitored,
      icon: Users,
      description: "Daily AI interactions monitored",
      trend: parseFloat(((trendingData.interactionsMonitoredDelta / selectedClient.interactionsMonitored) * 100).toFixed(1)),
      trendType: "percentage" as const
    },
    {
      title: "Agents Deployed",
      value: selectedClient.agentsDeployed,
      icon: Users,
      description: "Active AI agents in use",
      trend: trendingData.agentsDeployedDelta,
      trendType: "number" as const
    },
    {
      title: "AI Risk Assessment",
      value: getRiskLevel(selectedClient.riskScore),
      icon: Shield,
      description: "Current risk level assessment",
      isBadge: true
    },
    {
      title: "Compliance Coverage",
      value: `${selectedClient.complianceCoverage}%`,
      icon: CheckCircle,
      description: "Overall compliance framework coverage",
      trend: trendingData.complianceCoverageDelta,
      trendType: "percentage" as const
    }
  ] : [];

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

  if (!selectedClient) {
    return (
      <AppLayout headerTitle="Single Client View">
        <div className="flex items-center justify-center h-64">
          <p className="text-subtext">Client not found</p>
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