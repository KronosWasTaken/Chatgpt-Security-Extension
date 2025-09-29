import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTypesDonut } from "./charts/AlertTypesDonut";
import { AlertFamily, Severity, FrameworkTag } from "@/data/alerts";
import { Client, Alert } from "@/services/api";
import { AlertDetailsDrawer } from "./alert-details-drawer";
import { formatDate } from "@/data/utils";

const familyLabels: Record<AlertFamily, string> = {
  'UNSANCTIONED_USE': 'Unsanctioned Use',
  'SENSITIVE_DATA': 'Sensitive Data',
  'AGENT_RISK': 'Agent Risk',
  'POLICY_VIOLATION': 'Policy Violation',
  'USAGE_ANOMALY': 'Usage Anomaly',
  'COMPLIANCE_GAP': 'Compliance Gap',
  'CONFIG_DRIFT': 'Config Drift',
  'ENFORCEMENT': 'Enforcement'
};

const severityColors = {
  'Low': 'bg-risk-low text-white',
  'Medium': 'bg-risk-medium text-white', 
  'High': 'bg-risk-high text-white',
  'Critical': 'bg-destructive text-destructive-foreground'
};

const statusColors = {
  'Unassigned': 'bg-risk-high text-white',
  'Pending': 'bg-risk-medium text-white',
  'Complete': 'bg-risk-low text-white',
  'AI Resolved': 'bg-cybercept-teal text-white'
};

const frameworkLabels: Record<FrameworkTag, string> = {
  'NIST': 'NIST',
  'EU_AI': 'EU AI',
  'ISO_42001': 'ISO 42001',
  'CO_SB21_169': 'CO 21-169',
  'NYC_144': 'NYC 144'
};

interface AlertsFeedProps {
  clientId?: string;
  familyFilter?: AlertFamily | null;
  severityFilter?: Severity | null;
  alerts?: Alert[];
  clients?: Client[];
}

export function AlertsFeed({ clientId, familyFilter, severityFilter, alerts, clients }: AlertsFeedProps) {
  const [localSeverityFilter, setLocalSeverityFilter] = useState<Severity | null>(severityFilter || null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>("7d");

  // Helper function to get client name by ID
  const getClientName = (clientId: string) => {
    const client = clients?.find(c => c.id === clientId);
    return client?.name || clientId;
  };

  // Use provided alerts or fallback to empty array
  let filteredAlerts = alerts || [];

  // Filter by client if specified
  if (clientId) {
    filteredAlerts = filteredAlerts.filter(alert => alert.client_id === clientId);
  }

  // Filter by family if specified
  if (familyFilter) {
    filteredAlerts = filteredAlerts.filter(alert => alert.alert_family === familyFilter);
  }

  // Filter by severity if specified
  if (localSeverityFilter) {
    filteredAlerts = filteredAlerts.filter(alert => alert.severity === localSeverityFilter);
  }

  // Filter by time period
  const now = new Date();
  const timeFilterMap = {
    '24h': 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    '7d': 7 * 24 * 60 * 60 * 1000, // 7 days
    '30d': 30 * 24 * 60 * 60 * 1000, // 30 days
    'custom': Infinity // For now, show all for custom
  };
  
  const timeThreshold = timeFilterMap[timeFilter as keyof typeof timeFilterMap] || timeFilterMap['7d'];
  if (timeThreshold !== Infinity) {
    filteredAlerts = filteredAlerts.filter(alert => 
      now.getTime() - new Date(alert.created_at).getTime() <= timeThreshold
    );
  }

  // Sort by timestamp (newest first)
  filteredAlerts = filteredAlerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Generate chart data for alerts by family
  const chartData = Object.keys(familyLabels).map(family => {
    const count = filteredAlerts.filter(alert => alert.alert_family === family).length;
    return {
      family: familyLabels[family as AlertFamily],
      count,
      fullName: familyLabels[family as AlertFamily]
    };
  }).filter(item => item.count > 0); // Only show families with alerts

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Alerts</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={timeFilter}
                onValueChange={setTimeFilter}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={localSeverityFilter || "all"}
                onValueChange={(value) => setLocalSeverityFilter(value === "all" ? null : value as Severity)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Alerts Table - Left Side */}
            <div className="lg:col-span-2">
              <div className="max-h-[400px] overflow-auto border border-border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-background border-b hover:bg-transparent z-40">
                      <TableHead className="bg-background border-r font-semibold text-foreground">Date</TableHead>
                      {!clientId && <TableHead className="bg-background border-r font-semibold text-foreground">Client</TableHead>}
                      <TableHead className="bg-background border-r font-semibold text-foreground">Alert Type</TableHead>
                      <TableHead className="bg-background border-r font-semibold text-foreground">App/Agent</TableHead>
                      <TableHead className="bg-background border-r font-semibold text-foreground">Risk Severity</TableHead>
                      <TableHead className="bg-background border-r font-semibold text-foreground">Frameworks</TableHead>
                      <TableHead className="bg-background font-semibold text-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.length === 0 ? (
                      <TableRow>
                        <TableCell 
                          colSpan={clientId ? 6 : 7} 
                          className="text-center py-8 text-muted-foreground"
                        >
                          No alerts found matching the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAlerts.map((alert) => (
                      <TableRow
                        key={alert.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <TableCell className="text-sm">
                          {formatDate(alert.created_at)}
                        </TableCell>
                        {!clientId && (
                          <TableCell className="font-medium">
                            {getClientName(alert.client_id)}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{alert.title}</div>
                            {alert.subtype && (
                              <div className="text-xs text-muted-foreground">{alert.subtype}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{alert.application_id || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">Application</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={severityColors[alert.severity]}>
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {alert.frameworks ? alert.frameworks.map(framework => (
                              <Badge
                                key={framework}
                                variant="outline"
                                className="text-xs px-1.5 py-0.5"
                              >
                                {framework}
                              </Badge>
                            )) : (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[alert.status]}>
                            {alert.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Alert Types Chart - Right Side */}
            <div className="lg:col-span-1">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">Alert Types</h3>
                <AlertTypesDonut
                  data={chartData.map(item => ({
                    family: Object.keys(familyLabels).find(key => 
                      familyLabels[key as AlertFamily] === item.family
                    ) as AlertFamily,
                    count: item.count,
                    fullName: item.fullName
                  }))}
                  total={filteredAlerts.length}
                  rangeLabel={timeFilter === '24h' ? 'Last 24 hours' : 
                             timeFilter === '7d' ? 'Last 7 days' :
                             timeFilter === '30d' ? 'Last 30 days' : 'Custom'}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDetailsDrawer
        alert={selectedAlert}
        open={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
      />
    </>
  );
}