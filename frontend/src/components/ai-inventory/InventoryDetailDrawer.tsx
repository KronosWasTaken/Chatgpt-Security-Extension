import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InventoryDetail } from "@/data/inventoryDetails";
import { getStatusPillClass, getRiskBadgeClass, getIntegrationColor, formatDate } from "@/data/utils";
import { TrendingUp, TrendingDown, Calendar, CheckCircle, X, Shield } from "lucide-react";
import { useState } from "react";

interface InventoryDetailDrawerProps {
  item: InventoryDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryDetailDrawer({ item, open, onOpenChange }: InventoryDetailDrawerProps) {
  const [actionLoading, setActionLoading] = useState(false);

  if (!item) return null;

  const usersDelta = item.activeUsersDelta;
  const interactionsDelta = item.interactionsDelta;

  const handleApprove = async () => {
    setActionLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setActionLoading(false);
    onOpenChange(false);
  };

  const handleBlock = async () => {
    setActionLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setActionLoading(false);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-4xl max-h-[90vh] mx-auto">
        <DrawerHeader className="border-b border-border-color">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DrawerTitle className="flex items-center gap-2 mb-2">
                {item.applicationName}
                <Badge className={getStatusPillClass(item.status)}>
                  {item.status === 'Unsanctioned' && <div className="w-2 h-2 bg-risk-high rounded-full mr-1" />}
                  {item.status}
                </Badge>
              </DrawerTitle>
              <DrawerDescription>
                {item.vendor} • First Registered: {formatDate('2024-11-15')}
              </DrawerDescription>
            </div>
            
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </div>

          {/* Action Buttons */}
          {item.status === 'Unsanctioned' && (
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBlock}
                disabled={actionLoading}
                className="text-risk-high border-risk-high hover:bg-risk-high hover:text-white"
              >
                <X className="w-4 h-4 mr-1" />
                Block Application
              </Button>
              <Button 
                size="sm"
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-cybercept-teal hover:bg-cybercept-teal/90"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve/Register
              </Button>
            </div>
          )}
        </DrawerHeader>

        <div className="overflow-y-auto p-6">
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
                <div className="text-sm text-subtext">Connected systems</div>
              </CardContent>
            </Card>
          </div>

          {/* Connected Integrations */}
          {item.integrations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connected Integrations</CardTitle>
                <CardDescription>Third-party systems this application can access</CardDescription>
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

          {/* Top Users */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Users by Activity</CardTitle>
              <CardDescription>Users with highest interaction volume</CardDescription>
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
                <Shield className="w-4 h-4" />
                Risk Assessment Details
              </CardTitle>
              <CardDescription>
                Why this application received a {item.riskAssessment.level.toLowerCase()} risk rating
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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

            {/* Recent Interactions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent AI Interactions</CardTitle>
                <CardDescription>Latest activity with this application</CardDescription>
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
        </div>
      </DrawerContent>
    </Drawer>
  );
}