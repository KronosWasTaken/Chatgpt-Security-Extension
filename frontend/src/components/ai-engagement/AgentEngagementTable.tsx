import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Bot, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { aiEngagementData, AgentEngagement, isDataInitialized } from "@/data/aiEngagement";
import { AgentDrawer } from "./AgentDrawer";
import { useAIEngagementData } from "@/hooks/useAIEngagementData";

export const AgentEngagementTable = ({ id, days }: { id?: string; days?: number }) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentEngagement | null>(null);
   const { data: engagementData, isLoading } = useAIEngagementData(days);
  
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
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  if (isLoading) {
    return (
      <Card id={id} className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Agent Engagement</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card id={id} className="scroll-mt-20">
        <CardHeader>
          <CardTitle>Agent Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent (Vendor)</TableHead>
                <TableHead>Deployed</TableHead>
                <TableHead>Avg Prompts/Day</TableHead>
                <TableHead>Flagged Actions</TableHead>
                <TableHead>Trend (7d)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aiEngagementData.agents.map((agent) => (
                <TableRow 
                  key={agent.agent}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedAgent(agent)}
                >
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{agent.agent}</div>
                        <div className="text-sm text-muted-foreground">{agent.vendor}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{agent.deployed}</TableCell>
                  <TableCell>{agent.avg_prompts_per_day}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {agent.flagged_actions > 0 && (
                        <AlertCircle className="h-3 w-3 text-orange-500 mr-1" />
                      )}
                      {agent.flagged_actions}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {agent.trend_pct_7d >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      <span className={agent.trend_pct_7d >= 0 ? "text-emerald-500" : "text-red-500"}>
                        {agent.trend_pct_7d >= 0 ? "+" : ""}{agent.trend_pct_7d}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(agent.status)}>
                      {agent.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{formatLastActivity(agent.last_activity_iso)}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground ml-2" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AgentDrawer 
        agent={selectedAgent}
        open={!!selectedAgent}
        onOpenChange={(open) => !open && setSelectedAgent(null)}
      />
    </>
  );
};