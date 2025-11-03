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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Bot, X } from "lucide-react";
import { ApplicationEngagement } from "@/data/aiEngagement";

interface ApplicationDrawerProps {
  application: ApplicationEngagement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ApplicationDrawer = ({ application, open, onOpenChange }: ApplicationDrawerProps) => {
  if (!application) return null;

  // Mock data - will be replaced with API call
  const trendData = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    activeUsers: Math.floor(application.active_users * (0.8 + Math.random() * 0.4)),
    interactions: Math.floor(application.interactions_per_day * (0.8 + Math.random() * 0.4))
  }));

  // Mock department breakdown - will be replaced with API call
  const departmentData = [
    { name: 'Sales', value: 38, color: 'hsl(var(--chart-1))' },
    { name: 'Support', value: 26, color: 'hsl(var(--chart-2))' },
    { name: 'Marketing', value: 18, color: 'hsl(var(--chart-3))' },
    { name: 'Others', value: 18, color: 'hsl(var(--chart-4))' }
  ];

  const getUtilizationColor = (utilization: string) => {
    switch (utilization) {
      case "High": return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
      case "Medium": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
      case "Low": return "bg-red-500/20 text-red-700 dark:text-red-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bot className="h-6 w-6" />
              <div>
                <DrawerTitle className="text-left">{application.application}</DrawerTitle>
                <p className="text-sm text-muted-foreground">{application.vendor}</p>
              </div>
              <Badge className={getUtilizationColor(application.utilization)}>
                {application.utilization}
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
                <div className="text-2xl font-bold">{application.active_users}</div>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{application.interactions_per_day}</div>
                <p className="text-sm text-muted-foreground">Interactions/Day</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">22/30</div>
                <p className="text-sm text-muted-foreground">Days Active</p>
              </CardContent>
            </Card>
          </div>

          {/* Usage Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Trend (Last 30 Days)</CardTitle>
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
                      dataKey="activeUsers" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Active Users"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="interactions" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      name="Interactions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {/* Department Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Usage by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {departmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recommendation */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{application.recommendation}</p>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Stickiness:</span> 22/30 days active
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Trend:</span> 
                    <span className={application.trend_pct_7d >= 0 ? "text-emerald-600 ml-1" : "text-red-600 ml-1"}>
                      {application.trend_pct_7d >= 0 ? "+" : ""}{application.trend_pct_7d}% (7d)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};