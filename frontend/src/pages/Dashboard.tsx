import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiClient, Client, Alert } from "@/services/api";
import { getFrameworksForClient } from "@/data/frameworks";
import { getRiskLevel, getRiskBadgeClass, formatNumber } from "@/data/utils";
import { TrendingUp, Users, Shield, Activity } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { AlertsRibbon } from "@/components/alerts-ribbon";
import { AlertsFeed } from "@/components/alerts-feed";
import { AlertFamily } from "@/data/alerts";

// Mock sparkline data generator
const generateSparklineData = () => {
  return Array.from({ length: 7 }, (_, i) => ({
    day: i,
    value: Math.floor(Math.random() * 100) + 50,
  }));
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [alertFamilyFilter, setAlertFamilyFilter] = useState<AlertFamily | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load clients and alerts in parallel
        // const [clientsData, alertsData] = await Promise.all([
        //   apiClient.getClients(),
        //   apiClient.getAlerts({ limit: 10 })
        // ]);

        const clientsData=await apiClient.getClients();
       
        setClients(clientsData);
        // setAlerts(alertsData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate portfolio totals from real data
  const portfolioTotals = clients.reduce(
    (acc, client) => ({
      appsMonitored: acc.appsMonitored + client.apps_monitored,
      interactionsMonitored: acc.interactionsMonitored + client.interactions_monitored,
      agentsDeployed: acc.agentsDeployed + client.agents_deployed,
      avgRiskScore: acc.avgRiskScore + client.risk_score,
    }),
    { appsMonitored: 0, interactionsMonitored: 0, agentsDeployed: 0, avgRiskScore: 0 }
  );

  // Calculate average risk score
  if (clients.length > 0) {
    portfolioTotals.avgRiskScore = Math.round(portfolioTotals.avgRiskScore / clients.length);
  }

  // Mock trending data for now (would come from backend in real implementation)
  const portfolioTrending = {
    appsMonitoredDelta: 3,
    agentsDeployedDelta: 1,
  };

  const handleClientClick = (clientId: string) => {
    navigate(`/client?id=${clientId}`);
  };

  const kpiCards = [
    {
      title: "Applications Monitored",
      value: portfolioTotals.appsMonitored,
      icon: Activity,
      trend: portfolioTrending.appsMonitoredDelta,
      description: "AI applications across all clients",
      trendType: "number" as const
    },
    {
      title: "Interactions Monitored", 
      value: portfolioTotals.interactionsMonitored,
      icon: TrendingUp,
      trend: 12.5,
      description: "Daily AI interactions tracked",
      trendType: "percentage" as const
    },
    {
      title: "Agents Deployed",
      value: portfolioTotals.agentsDeployed,
      icon: Users,
      trend: portfolioTrending.agentsDeployedDelta,
      description: "Active AI agents deployed",
      trendType: "number" as const
    },
    {
      title: "AI Risk Assessment",
      value: getRiskLevel(portfolioTotals.avgRiskScore),
      icon: Shield,
      trend: 0,
      description: "Average risk level across portfolio",
      isBadge: true,
      trendType: "percentage" as const
    }
  ];

  if (error) {
    return (
      <AppLayout headerTitle="MSP Portfolio">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-heading-text mb-2">Error Loading Dashboard</h3>
            <p className="text-body-text mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-cybercept-blue text-white rounded-lg hover:bg-cybercept-blue/90"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout headerTitle="MSP Portfolio">
        <div className="space-y-6">
          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-0 shadow-elegant">
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Table Skeleton */}
          <Card className="border-0 shadow-elegant">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout headerTitle="MSP Portfolio">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            const sparklineData = generateSparklineData();
            
            return (
              <Card key={card.title} className="border-0 shadow-elegant bg-gradient-brand-subtle">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-subtext font-medium">
                      {card.title}
                    </CardDescription>
                    <Icon className="w-5 h-5 text-cybercept-blue" />
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      {card.isBadge ? (
                        <Badge className={`${getRiskBadgeClass(card.value as any)} text-sm font-semibold`}>
                          {card.value}
                        </Badge>
                      ) : (
                        <div className="text-2xl font-bold text-heading-text">
                          {formatNumber(card.value as number)}
                        </div>
                      )}
                      
                      {card.trend !== 0 && (
                        <div className={`text-sm font-medium mt-1 ${
                          card.trend > 0 ? 'text-cybercept-teal' : 'text-risk-high'
                        }`}>
                          {card.trendType === 'number' ? (
                            `${card.trend > 0 ? '+' : ''}${card.trend} vs last 7d`
                          ) : (
                            `${card.trend > 0 ? '+' : ''}${card.trend}% vs last 7d`
                          )}
                        </div>
                      )}
                    </div>
                    
                    {!card.isBadge && (
                      <div className="w-16 h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sparklineData}>
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="hsl(var(--cybercept-teal))" 
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Alerts */}
        <AlertsFeed 
          familyFilter={alertFamilyFilter}
          alerts={alerts}
          clients={clients}
        />

        {/* Clients Table */}
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="text-heading-text">Client Portfolio</CardTitle>
            <CardDescription>
              Click on any client to view detailed security metrics
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold">Industry</TableHead>
                    <TableHead className="font-semibold text-center">Applications Monitored</TableHead>
                    <TableHead className="font-semibold text-center">Interactions Monitored</TableHead>
                    <TableHead className="font-semibold text-center">AI Agents Deployed</TableHead>
                    <TableHead className="font-semibold text-center">Compliance Frameworks</TableHead>
                    <TableHead className="font-semibold text-center">AI Risk</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {clients.map((client) => {
                    const clientFrameworks = getFrameworksForClient(client.id);
                    return (
                      <TableRow 
                        key={client.id}
                        onClick={() => handleClientClick(client.id)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="font-medium text-heading-text">
                          {client.name}
                        </TableCell>
                        <TableCell className="text-body-text">
                          {client.industry}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-cybercept-blue">
                          {client.apps_monitored}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {formatNumber(client.interactions_monitored)}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-cybercept-teal">
                          {client.agents_deployed}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {clientFrameworks.length}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getRiskBadgeClass(getRiskLevel(client.risk_score))}>
                            {getRiskLevel(client.risk_score)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;