import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useAIEngagementData } from "@/hooks/useAIEngagementData";

export const DepartmentUsage = ({ id, days }: { id?: string; days?: number }) => {
  const { data: engagementData, isLoading } = useAIEngagementData(days);
  
  if (isLoading) {
    return (
      <Card id={id} className="scroll-mt-20">
        <CardHeader>
          <CardTitle>Department Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!engagementData || !engagementData.departments) {
    return (
      <Card id={id} className="scroll-mt-20">
        <CardHeader>
          <CardTitle>Department Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No department data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = engagementData.departments.map(dept => ({
    ...dept,
    interactions_per_user: dept.active_users > 0 ? Math.round(dept.interactions / dept.active_users) : 0
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            Interactions: {data.interactions.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            Active Users: {data.active_users}
          </p>
          <div className="flex items-center text-sm mt-1">
            {data.pct_change_vs_prev_7d >= 0 ? (
              <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={data.pct_change_vs_prev_7d >= 0 ? "text-emerald-500" : "text-red-500"}>
              {data.pct_change_vs_prev_7d >= 0 ? "+" : ""}{data.pct_change_vs_prev_7d}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card id={id} className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Usage by Department</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 mb-6 bg-muted animate-pulse rounded" />
          <div className="space-y-2">
            <h4 className="font-medium mb-3">Department Details</h4>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-8 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Usage by Department</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="department" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="interactions" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium mb-3">Department Details</h4>
          <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
            <div>Department</div>
            <div>Interactions</div>
            <div>Active Users</div>
            <div>Interactions/User</div>
            <div>Change (7d)</div>
          </div>
          {data.map((dept) => (
            <div key={dept.department} className="grid grid-cols-5 gap-4 text-sm py-2 border-b border-border/50">
              <div className="font-medium">{dept.department}</div>
              <div>{dept.interactions.toLocaleString()}</div>
              <div>{dept.active_users}</div>
              <div>{dept.interactions_per_user}</div>
              <div className="flex items-center">
                {dept.pct_change_vs_prev_7d >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={dept.pct_change_vs_prev_7d >= 0 ? "text-emerald-500" : "text-red-500"}>
                  {dept.pct_change_vs_prev_7d >= 0 ? "+" : ""}{dept.pct_change_vs_prev_7d}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};