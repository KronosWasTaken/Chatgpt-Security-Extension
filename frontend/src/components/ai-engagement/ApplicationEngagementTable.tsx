import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Bot, ExternalLink, Loader2 } from "lucide-react";
import { ApplicationDrawer } from "./ApplicationDrawer";
import { useAIEngagementData } from "@/hooks/useAIEngagementData";

// Define the ApplicationEngagement interface locally
interface ApplicationEngagement {
  id: string;
  name: string;
  vendor: string;
  icon: string;
  active_users: number;
  interactions_per_day: number;
  utilization: string;
  trend_pct_7d: number;
  status: string;
  last_activity_iso: string;
}

export const ApplicationEngagementTable = ({ id, days }: { id?: string; days?: number }) => {
  const [selectedApp, setSelectedApp] = useState<ApplicationEngagement | null>(null);

   const { data: engagementData, isLoading } = useAIEngagementData(days);
  
  const getUtilizationColor = (utilization: string) => {
    switch (utilization) {
      case "High": return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
      case "Medium": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
      case "Low": return "bg-red-500/20 text-red-700 dark:text-red-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getAppIcon = (iconName: string) => {
    // For demo purposes, using Bot icon for all apps
    // In real implementation, you'd map iconName to actual app icons
    return <Bot className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <Card id={id} className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Application Engagement</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get applications from the engagement data
  const applications = engagementData?.applications || [];
  
  // Show no data message if no applications
  if (!applications || applications.length === 0) {
    return (
      <Card id={id} className="scroll-mt-20">
        <CardHeader>
          <CardTitle>Application Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No application engagement data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card id={id} className="scroll-mt-20">
        <CardHeader>
          <CardTitle>Application Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application (Vendor)</TableHead>
                <TableHead>Active Users</TableHead>
                <TableHead>Interactions/Day</TableHead>
                <TableHead>Trend (7d)</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Recommendation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow 
                  key={app.application}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedApp(app)}
                >
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getAppIcon(app.icon)}
                      <div>
                        <div className="font-medium">{app.application}</div>
                        <div className="text-sm text-muted-foreground">{app.vendor}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{app.active_users}</TableCell>
                  <TableCell>{app.interactions_per_day}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {app.trend_pct_7d >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      <span className={app.trend_pct_7d >= 0 ? "text-emerald-500" : "text-red-500"}>
                        {app.trend_pct_7d >= 0 ? "+" : ""}{app.trend_pct_7d}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getUtilizationColor(app.utilization)}>
                      {app.utilization}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{app.recommendation}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground ml-2" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ApplicationDrawer 
        application={selectedApp}
        open={!!selectedApp}
        onOpenChange={(open) => !open && setSelectedApp(null)}
      />
    </>
  );
};