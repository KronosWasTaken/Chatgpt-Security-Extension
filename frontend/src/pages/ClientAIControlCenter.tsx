import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ShieldAlert, Users, Clock, ChevronDown, CheckCircle, XCircle, Eye, UserCheck, Ban, AlertCircle, Calendar, RefreshCw } from "lucide-react";
import { useClients, useClient, useClientActionQueue, useResolveAction } from "@/hooks/useApi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientAIControlCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedClientId, setSelectedClientId] = useState(searchParams.get("client") || "");
  const [dateRange, setDateRange] = useState("30");
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [expandedArchive, setExpandedArchive] = useState<string | null>(null);

  // API hooks
  const { data: clients, isLoading: clientsLoading, error: clientsError, refetch: refetchClients } = useClients();
  const { data: selectedClient, isLoading: clientLoading, error: clientError, refetch: refetchClient } = useClient(selectedClientId);
  const { data: actionQueueData, isLoading: actionQueueLoading, error: actionQueueError, refetch: refetchActionQueue } = useClientActionQueue(selectedClientId);
  const resolveActionMutation = useResolveAction();

  // Error states
  const hasError = clientsError || clientError || actionQueueError;
  const isLoading = clientsLoading || clientLoading || actionQueueLoading;

  useEffect(() => {
    if (selectedClientId !== searchParams.get("client")) {
      setSearchParams({ client: selectedClientId });
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
    refetchActionQueue();
  };

  const handleResolveAction = async (actionId: string, actionType: string, resolution: string) => {
    try {
      await resolveActionMutation.mutateAsync({
        clientId: selectedClientId,
        actionId,
        actionType,
        resolution
      });
    } catch (error) {
      console.error('Failed to resolve action:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'destructive';
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Outstanding': return 'destructive';
      case 'In Progress': return 'secondary';
      case 'Completed': return 'default';
      default: return 'outline';
    }
  };

  const clientOptions = clients?.map(client => ({
    value: client.id,
    label: client.name
  })) || [];

  // Error state
  if (hasError) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load control center data. 
              <Button variant="link" onClick={handleRetry} className="p-0 h-auto ml-1">
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-48" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  const unsanctionedApps = actionQueueData?.unsanctioned_apps || [];
  const flaggedAgents = actionQueueData?.flagged_agents || [];
  const policyViolations = actionQueueData?.policy_violations || [];
  const highPriorityAlerts = actionQueueData?.high_priority_alerts || [];
  const totalActions = actionQueueData?.total_actions || 0;
  const urgentCount = actionQueueData?.urgent_count || 0;

  return (
    <AppLayout>
      {/* Header Section */}
      <div className="bg-surface border-b border-border-color sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-heading-text">AI Control Center</h1>
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
                  {clientOptions.map(client => (
                    <SelectItem key={client.value} value={client.value}>
                      {client.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-subtext">Urgent Actions</p>
                  <p className="text-2xl font-bold text-heading-text">{urgentCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-subtext">Unsanctioned Apps</p>
                  <p className="text-2xl font-bold text-heading-text">{unsanctionedApps.length}</p>
                </div>
                <ShieldAlert className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-subtext">Flagged Agents</p>
                  <p className="text-2xl font-bold text-heading-text">{flaggedAgents.length}</p>
                </div>
                <Users className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-subtext">Total Actions</p>
                  <p className="text-2xl font-bold text-heading-text">{totalActions}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Queue Tabs */}
        <Tabs defaultValue="unsanctioned" className="space-y-4">
          <TabsList>
            <TabsTrigger value="unsanctioned">Unsanctioned Apps ({unsanctionedApps.length})</TabsTrigger>
            <TabsTrigger value="flagged">Flagged Agents ({flaggedAgents.length})</TabsTrigger>
            <TabsTrigger value="violations">Policy Violations ({policyViolations.length})</TabsTrigger>
            <TabsTrigger value="alerts">High Priority Alerts ({highPriorityAlerts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="unsanctioned">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  Unsanctioned Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unsanctionedApps.length === 0 ? (
                  <div className="text-center py-8 text-subtext">
                    No unsanctioned applications found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Interactions/Day</TableHead>
                        <TableHead>Risk Score</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unsanctionedApps.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{app.name}</div>
                              <div className="text-sm text-subtext">{app.vendor}</div>
                            </div>
                          </TableCell>
                          <TableCell>{app.users}</TableCell>
                          <TableCell>{app.interactions_per_day}</TableCell>
                          <TableCell>
                            <Badge variant={app.risk_score > 70 ? "destructive" : "secondary"}>
                              {app.risk_score}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResolveAction(app.id, "unsanctioned_app", "approve")}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleResolveAction(app.id, "unsanctioned_app", "block")}
                              >
                                <Ban className="w-4 h-4 mr-1" />
                                Block
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flagged">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Flagged Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {flaggedAgents.length === 0 ? (
                  <div className="text-center py-8 text-subtext">
                    No flagged agents found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Flagged Actions</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Last Flagged</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flaggedAgents.map((agent) => (
                        <TableRow key={agent.id}>
                          <TableCell className="font-medium">{agent.agent_name}</TableCell>
                          <TableCell>{agent.vendor}</TableCell>
                          <TableCell>{agent.flagged_actions}</TableCell>
                          <TableCell>
                            <Badge variant={getSeverityColor(agent.severity)}>
                              {agent.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(agent.last_flagged).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolveAction(agent.id, "flagged_agent", "review")}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="violations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Policy Violations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {policyViolations.length === 0 ? (
                  <div className="text-center py-8 text-subtext">
                    No policy violations found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Violation Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>AI Service</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policyViolations.map((violation) => (
                        <TableRow key={violation.id}>
                          <TableCell className="font-medium">{violation.violation_type}</TableCell>
                          <TableCell>{violation.user_name}</TableCell>
                          <TableCell>{violation.ai_service}</TableCell>
                          <TableCell>
                            <Badge variant={getSeverityColor(violation.severity)}>
                              {violation.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={violation.is_resolved ? "default" : "destructive"}>
                              {violation.is_resolved ? "Resolved" : "Outstanding"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {!violation.is_resolved && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResolveAction(violation.id, "policy_violation", "resolve")}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Resolve
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  High Priority Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {highPriorityAlerts.length === 0 ? (
                  <div className="text-center py-8 text-subtext">
                    No high priority alerts found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {highPriorityAlerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell className="font-medium">{alert.title}</TableCell>
                          <TableCell>
                            <Badge variant={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(alert.status)}>
                              {alert.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(alert.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolveAction(alert.id, "alert", "complete")}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Complete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}