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
import { AlertTriangle, ShieldAlert, Users, Clock, ChevronDown, CheckCircle, XCircle, Eye, UserCheck, Ban, AlertCircle, Calendar } from "lucide-react";
import { actionQueue, unsanctionedApps, flaggedAgents, archivedActions } from "@/data/actionQueue";
import { alerts } from "@/data/alerts";
import { clients } from "@/data/clients";

export default function ClientAIControlCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedClientId, setSelectedClientId] = useState(searchParams.get("client") || "1");
  const [dateRange, setDateRange] = useState("30");
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [expandedArchive, setExpandedArchive] = useState<string | null>(null);

  useEffect(() => {
    if (selectedClientId !== searchParams.get("client")) {
      setSearchParams({ client: selectedClientId });
    }
  }, [selectedClientId, searchParams, setSearchParams]);

  const selectedClient = clients.find(client => client.id === selectedClientId);

  // Filter alerts for current client (assuming acme-health for demo)
  const clientAlerts = alerts.filter(alert => alert.clientId === 'acme-health');
  const highSeverityAlerts = clientAlerts.filter(alert => alert.severity === 'High' || alert.severity === 'Critical');
  const unsanctionedCount = unsanctionedApps.length;
  const flaggedAgentCount = flaggedAgents.reduce((sum, agent) => sum + agent.flaggedActions, 0);

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

  return (
    <AppLayout>
      <div className="min-h-screen bg-app-bg">
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

        {/* Content */}
        <div className="space-y-6 p-6">

          {/* Alerts Overview Banner */}
          <Card className="border-l-4 border-l-destructive bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium">
                  ⚠ {unsanctionedCount} unsanctioned applications require review · {flaggedAgentCount} agent actions flagged high-risk
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highSeverityAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{alert.app} - {alert.family.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">{alert.details}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {alert.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.ts).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Action Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>App/Agent</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionQueue.map((item) => (
                  <TableRow key={item.id} className={item.status === 'Outstanding' ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium">{item.action}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.appOrAgent}</p>
                        <p className="text-xs text-muted-foreground">{item.vendor}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityColor(item.riskLevel)}>
                        {item.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.assignedTo || 'Unassigned'}</TableCell>
                    <TableCell>{item.dateCreated}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <XCircle className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <UserCheck className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tabs for Applications and Agents */}
        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="applications">Unsanctioned Applications</TabsTrigger>
            <TabsTrigger value="agents">Flagged Agent Actions</TabsTrigger>
            <TabsTrigger value="archive">Governance Archive</TabsTrigger>
          </TabsList>

          {/* Unsanctioned Applications */}
          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Unsanctioned Applications Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {unsanctionedApps.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">{app.icon}</div>
                        <div>
                          <h3 className="font-semibold">{app.name}</h3>
                          <p className="text-sm text-muted-foreground">{app.vendor}</p>
                          <p className="text-xs text-muted-foreground">{app.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge variant={getSeverityColor(app.riskAssessment)} className="mb-2">
                            {app.riskAssessment} Risk
                          </Badge>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>{app.users} users</p>
                            <p>{app.interactions} interactions</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive">
                            <Ban className="h-3 w-3 mr-1" />
                            Block
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flagged Agent Actions */}
          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Flagged Agent Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {flaggedAgents.map((agent) => (
                    <Collapsible
                      key={agent.id}
                      open={expandedAgent === agent.id}
                      onOpenChange={(open) => setExpandedAgent(open ? agent.id : null)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent">
                          <div className="flex items-center gap-4">
                            <div>
                              <h3 className="font-semibold">{agent.name}</h3>
                              <p className="text-sm text-muted-foreground">{agent.vendor}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm">
                              <p>{agent.deployed} deployed</p>
                              <p className="text-muted-foreground">
                                {agent.flaggedActions} flagged actions
                              </p>
                            </div>
                            <Badge variant={getSeverityColor(agent.riskLevel)}>
                              {agent.riskLevel}
                            </Badge>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 pb-4">
                        <div className="space-y-4 mt-4 border-t pt-4">
                          <div>
                            <h4 className="font-medium mb-2">Flagged Prompts:</h4>
                            <ul className="space-y-1">
                              {agent.flaggedPrompts.map((prompt, idx) => (
                                <li key={idx} className="text-sm bg-destructive/10 p-2 rounded">
                                  "{prompt}"
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Departments Affected:</h4>
                            <div className="flex gap-2">
                              {agent.departmentsAffected.map((dept) => (
                                <Badge key={dept} variant="secondary">
                                  {dept}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button size="sm" variant="destructive">
                              <Ban className="h-3 w-3 mr-1" />
                              Quarantine
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3 mr-1" />
                              Review Logs
                            </Button>
                            <Button size="sm" variant="outline">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Assign Owner
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Governance Archive */}
          <TabsContent value="archive">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Blocked Applications & Agents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {archivedActions.map((action) => (
                      <Collapsible
                        key={action.id}
                        open={expandedArchive === action.id}
                        onOpenChange={(open) => setExpandedArchive(open ? action.id : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent">
                            <div className="flex items-center gap-4">
                              <Badge variant="outline">{action.type}</Badge>
                              <div>
                                <h3 className="font-semibold">{action.name}</h3>
                                <p className="text-sm text-muted-foreground">{action.vendor}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right text-sm">
                                <p>Blocked: {action.dateBlocked}</p>
                                <p className="text-muted-foreground">{action.actionTaken}</p>
                              </div>
                              <ChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4">
                          <div className="mt-4 border-t pt-4">
                            <h4 className="font-medium mb-2">Notes:</h4>
                            <p className="text-sm text-muted-foreground">{action.notes}</p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}