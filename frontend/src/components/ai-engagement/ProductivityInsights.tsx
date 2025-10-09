import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { aiEngagementData} from "@/data/aiEngagement";
import { TrendingUp, Loader2 } from "lucide-react";
import { useAIEngagementData } from "@/hooks/useAIEngagementData";

export const ProductivityInsights = ({ id, days }: { id?: string; days?: number }) => {
   const { data: engagementData, isLoading } = useAIEngagementData(days);
  
  // Transform correlation data for the chart
  const chartData = engagementData.productivity_correlations.Sales?.ai_interactions_7d?.map((_, index) => ({
    day: index + 1,
    salesAI: engagementData.productivity_correlations.Sales?.ai_interactions_7d?.[index] || 0,
    salesOutput: engagementData.productivity_correlations.Sales?.output_metric_7d?.[index] || 0,
    supportAI: engagementData.productivity_correlations["Customer Support"]?.ai_interactions_7d?.[index] || 0,
    supportOutput: engagementData.productivity_correlations["Customer Support"]?.output_metric_7d?.[index] || 0,
    marketingAI: engagementData.productivity_correlations.Marketing?.ai_interactions_7d?.[index] || 0,
    marketingOutput: engagementData.productivity_correlations.Marketing?.output_metric_7d?.[index] || 0
  })) || [];

  const insights = [
    {
      title: "Sales Performance",
      metric: "+12% emails drafted",
      description: "Higher AI usage aligns with increased email output",
      trend: "+12%"
    },
    {
      title: "Support Efficiency", 
      metric: "+8% faster resolutions",
      description: "AI assistance correlates with quicker ticket resolution",
      trend: "+8%"
    },
    {
      title: "Marketing Output",
      metric: "+15% content created",
      description: "Steady lift in creative output with AI tools",
      trend: "+15%"
    },
    {
      title: "Cross-Department",
      metric: "35% productivity gain",
      description: "Teams using AI report higher satisfaction scores",
      trend: "+35%"
    }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">Day {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
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
            <span>Productivity Insights (Correlations)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-80 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-l-4">
                <CardContent className="pt-4">
                  <div className="h-20 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Productivity Insights (Correlations)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }}
                label={{ value: 'AI Interactions', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                tick={{ fontSize: 12 }}
                label={{ value: 'Output Metrics', angle: 90, position: 'insideRight' }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* AI Interaction Lines */}
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="salesAI" 
                stroke="hsl(var(--cybercept-blue))" 
                strokeWidth={2}
                name="Sales AI Interactions"
                strokeDasharray="5 5"
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="supportAI" 
                stroke="hsl(var(--cybercept-teal))" 
                strokeWidth={2}
                name="Support AI Interactions"
                strokeDasharray="5 5"
              />
              
              {/* Output Lines */}
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="salesOutput" 
                stroke="hsl(var(--cybercept-blue))" 
                strokeWidth={3}
                name="Sales Emails Drafted"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="supportOutput" 
                stroke="hsl(var(--cybercept-teal))" 
                strokeWidth={3}
                name="Support Tickets Resolved"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {insights.map((insight, index) => {
            const borderColors = ['hsl(var(--cybercept-blue))', 'hsl(var(--cybercept-teal))', 'hsl(var(--risk-medium))', 'hsl(var(--risk-low))'];
            return (
            <Card key={insight.title} className="border-l-4" 
                  style={{ borderLeftColor: borderColors[index % 4] }}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  <div className="flex items-center text-emerald-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <span className="text-xs font-medium">{insight.trend}</span>
                  </div>
                </div>
                <div className="text-lg font-bold mb-1">{insight.metric}</div>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
              </CardContent>
            </Card>
          );
          })}
        </div>
      </CardContent>
    </Card>
  );
};