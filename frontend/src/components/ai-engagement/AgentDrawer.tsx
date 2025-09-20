import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Bot, X, Clock, AlertCircle } from "lucide-react";
import { AgentEngagement } from "@/data/aiEngagement";

interface AgentDrawerProps {
  agent: AgentEngagement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AgentDrawer = ({ agent, open, onOpenChange }: AgentDrawerProps) => {
  if (!agent) return null;

  // Mock 30-day trend data
  const trendData = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    prompts: Math.floor(agent.avg_prompts_per_day * (0.7 + Math.random() * 0.6))
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Rising": return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
      case "Stable": return "bg-blue-500/20 text-blue-700 dark:text-blue-300";
      case "Dormant": return "bg-red-500/20 text-red-700 dark:text-red-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatLastActivity = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString();
  };

  const getStatusTip = (status: string) => {
    switch (status) {
      case "Dormant": return "Promote to Finance via weekly workflows";
      case "Rising": return "Monitor for scaling opportunities";
      case "Stable": return "Maintain current deployment";
      default: return "";
    }
  };

  // Mock sensitive actions data
  const sensitiveActions = agent.flagged_actions > 0 ? [
    {
      timestamp: "2025-09-09T14:30:00Z",
      summary: "Attempted to access customer financial data outside of approved parameters"
    },
    {
      timestamp: "2025-09-08T10:15:00Z", 
      summary: "Generated response containing potential PII without proper masking"
    }
  ].slice(0, agent.flagged_actions) : [];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bot className="h-6 w-6" />
              <div>
                <DrawerTitle className="text-left">{agent.agent}</DrawerTitle>
                <p className="text-sm text-muted-foreground">{agent.vendor}</p>
              </div>
              <Badge className={getStatusColor(agent.status)}>
                {agent.status}
              </Badge>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{agent.deployed}</div>
                <p className="text-sm text-muted-foreground">Deployed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{agent.avg_prompts_per_day}</div>
                <p className="text-sm text-muted-foreground">Avg Prompts/Day</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold">{agent.flagged_actions}</div>
                  {agent.flagged_actions > 0 && (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Flagged Actions</p>
              </CardContent>
            </Card>
          </div>

          {/* Prompt Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Prompt Trend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="prompts" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Prompts per Day"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {/* Activity Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Activity Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Last Activity</div>
                  <div className="text-sm text-muted-foreground">
                    {formatLastActivity(agent.last_activity_iso)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Associated Applications</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {agent.associated_apps.map((app) => (
                      <Badge key={app} variant="outline" className="text-xs">
                        {app}
                      </Badge>
                    ))}
                  </div>
                </div>
                {getStatusTip(agent.status) && (
                  <div>
                    <div className="text-sm font-medium">Status Tip</div>
                    <div className="text-sm text-muted-foreground">
                      {getStatusTip(agent.status)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sensitive Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>Sensitive Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sensitiveActions.length > 0 ? (
                  <div className="space-y-3">
                    {sensitiveActions.map((action, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          {new Date(action.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-sm">{action.summary}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No flagged actions recorded
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};