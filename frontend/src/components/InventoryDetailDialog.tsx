import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryDetail } from "@/data/inventoryDetails";
import { getStatusPillClass, getRiskBadgeClass, getIntegrationColor } from "@/data/utils";
import { TrendingUp, TrendingDown, Users, Activity, AlertTriangle } from "lucide-react";

interface InventoryDetailDialogProps {
  item: InventoryDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryDetailDialog({ item, open, onOpenChange }: InventoryDetailDialogProps) {
  if (!item) return null;

  const usersDelta = item.activeUsersDelta;
  const interactionsDelta = item.interactionsDelta;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.applicationName}
            <Badge className={getStatusPillClass(item.status)}>
              {item.status === 'Unsanctioned' && <div className="w-2 h-2 bg-risk-high rounded-full mr-1" />}
              {item.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {item.vendor} • Detailed application metrics and insights
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Active Users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.activeUsers}</div>
                <div className={`flex items-center text-sm mt-1 ${
                  usersDelta >= 0 ? 'text-cybercept-teal' : 'text-risk-high'
                }`}>
                  {usersDelta >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {usersDelta >= 0 ? '+' : ''}{usersDelta} vs 7d ago
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Daily Interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.interactions.toLocaleString()}</div>
                <div className={`flex items-center text-sm mt-1 ${
                  interactionsDelta >= 0 ? 'text-cybercept-teal' : 'text-risk-high'
                }`}>
                  {interactionsDelta >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {interactionsDelta >= 0 ? '+' : ''}{interactionsDelta} vs 7d ago
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Risk Level</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge className={getRiskBadgeClass(item.riskAssessment.level)}>
                  {item.riskAssessment.level}
                </Badge>
                <div className="text-sm text-subtext mt-1">
                  Score: {item.riskAssessment.score}/100
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.integrations.length}</div>
                <div className="text-sm text-subtext">Third-party connections</div>
              </CardContent>
            </Card>
          </div>

          {/* Third-party Integrations */}
          {item.integrations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Third-party Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {item.integrations.map((integration) => (
                    <Badge key={integration} variant="secondary" className={getIntegrationColor(integration)}>
                      {integration}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top 3 Users */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 3 Users</CardTitle>
              <CardDescription>Highest interaction volume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {item.topUsers.map((user, index) => (
                  <div key={user.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-cybercept-blue text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-heading-text">{user.name}</p>
                        <p className="text-sm text-subtext">{user.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-body-text">{user.interactions}</p>
                      <p className="text-xs text-subtext">interactions</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Badge className={getRiskBadgeClass(item.riskAssessment.level)}>
                    {item.riskAssessment.level} Risk
                  </Badge>
                  <div className="flex-1">
                    <Progress value={item.riskAssessment.score} className="h-2" />
                  </div>
                  <span className="text-sm font-medium">{item.riskAssessment.score}/100</span>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Risk Factors:</p>
                  <ul className="text-sm text-subtext space-y-1">
                    {item.riskAssessment.factors.map((factor, index) => (
                      <li key={index}>• {factor}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Last 30 AI Interactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent AI Interactions</CardTitle>
              <CardDescription>Last 30 interactions with this application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Interaction Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.recentInteractions.map((interaction, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{interaction.user}</TableCell>
                        <TableCell>{interaction.department}</TableCell>
                        <TableCell className="text-sm text-subtext">{interaction.timestamp}</TableCell>
                        <TableCell className="text-sm">{interaction.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}