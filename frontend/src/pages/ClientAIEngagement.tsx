import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { KPITiles } from "@/components/ai-engagement/KPITiles";
import { DepartmentUsage } from "@/components/ai-engagement/DepartmentUsage";
import { ApplicationEngagementTable } from "@/components/ai-engagement/ApplicationEngagementTable";
import { AgentEngagementTable } from "@/components/ai-engagement/AgentEngagementTable";
import { ProductivityInsights } from "@/components/ai-engagement/ProductivityInsights";
import { RecommendationsPanel } from "@/components/ai-engagement/RecommendationsPanel";
import { ClientMCP } from "@/components/client-mcp/ClientMCP";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClients, useClient } from "@/hooks/useApi";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Calendar } from "lucide-react";

export default function ClientAIEngagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedClientId, setSelectedClientId] = useState(searchParams.get("id") || "");
  const [dateRange, setDateRange] = useState("30");
  const [activeSection, setActiveSection] = useState<string>("");

  // API hooks
  const { data: clients, isLoading: clientsLoading, error: clientsError, refetch: refetchClients } = useClients();
  const { data: selectedClient, isLoading: clientLoading, error: clientError, refetch: refetchClient } = useClient(selectedClientId);

  // Error states
  const hasError = clientsError || clientError;
  const isLoading = clientsLoading || clientLoading;

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
  };

  const scrollToSection = (section: string) => {
    setActiveSection(section);
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest' 
      });
    }
  };

  // Error state
  if (hasError) {
    return (
      <AppLayout 
        headerTitle="AI Engagement"
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
                <p className="font-semibold">Failed to load engagement data</p>
                <p className="text-sm">
                  {clientsError && "Failed to load clients list. "}
                  {clientError && "Failed to load client details. "}
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
        headerTitle="AI Engagement"
        headerActions={<Skeleton className="h-10 w-64" />}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
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
        headerTitle="AI Engagement"
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
    <AppLayout>
      <div className="min-h-screen bg-app-bg">
        {/* Header Section */}
        <div className="bg-surface border-b border-border-color sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-heading-text">AI Engagement</h1>
                <p className="text-subtext text-sm mt-1">
                  {selectedClient?.name || "Select a client"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
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

        <div className="px-6 py-6 space-y-8">
          {/* KPI Tiles */}
          <KPITiles onTileClick={scrollToSection} />
          
          {/* Navigation to Client MCP */}
          <div className="flex justify-center">
            <button
              onClick={() => scrollToSection("client-mcp")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              View Real-time Interaction Monitoring
            </button>
          </div>

          {/* Client MCP - Real-time Interaction Monitoring */}
          {selectedClient && (
            <div id="client-mcp" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-heading-text">Real-time Interaction Monitoring</h2>
                <div className="text-sm text-subtext">
                  Live tracking of AI application interactions
                </div>
              </div>
              <ClientMCP 
                clientId={selectedClientId} 
                clientName={selectedClient.name} 
              />
            </div>
          )}

          {/* Department Usage */}
          <DepartmentUsage id="departments" />

          {/* Application Engagement */}
          <ApplicationEngagementTable id="applications" />

          {/* Agent Engagement */}
          <AgentEngagementTable id="agents" />

          {/* Productivity Insights */}
          {/* <ProductivityInsights id="productivity" /> */}

          {/* Recommendations */}
          <RecommendationsPanel id="recommendations" />
        </div>
      </div>
    </AppLayout>
  );
}