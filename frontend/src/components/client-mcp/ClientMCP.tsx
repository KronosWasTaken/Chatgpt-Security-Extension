import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { useClientInteractions, useApplicationInteractions, useIncrementInteractionCount } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";

interface ClientMCPProps {
  clientId: string;
  clientName: string;
}

export const ClientMCP: React.FC<ClientMCPProps> = ({ clientId, clientName }) => {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { 
    data: clientInteractions, 
    isLoading: clientLoading, 
    error: clientError,
    refetch: refetchClient
  } = useClientInteractions(clientId);
  
  const { 
    data: appInteractions, 
    isLoading: appLoading, 
    error: appError 
  } = useApplicationInteractions(clientId, selectedApp || '');
  
  const incrementMutation = useIncrementInteractionCount();

  const handleIncrementInteraction = async (appId: string) => {
    try {
      await incrementMutation.mutateAsync({
        clientId,
        appId,
        count: 1
      });
      toast({
        title: "Interaction Recorded",
        description: "Interaction count has been incremented successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record interaction",
        variant: "destructive"
      });
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return "text-red-600";
    if (riskScore >= 40) return "text-yellow-600";
    return "text-green-600";
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case "Compliant": return "bg-green-100 text-green-800";
      case "Needs Review": return "bg-yellow-100 text-yellow-800";
      case "Medium Risk": return "bg-orange-100 text-orange-800";
      case "High Risk": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (clientLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading Client MCP Data...</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-32 bg-muted animate-pulse rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clientError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Client MCP - {clientName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Failed to load client interaction data</p>
            <Button 
              onClick={() => refetchClient()} 
              variant="outline" 
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const interactions = clientInteractions || {};
  const topApps = interactions.top_applications || [];
  const trends = interactions.interaction_trends || [];

  return (
    <div className="space-y-6">
      {/* Main Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Client MCP - {clientName}</span>
            <div className="flex items-center space-x-2">
              <Badge className={getComplianceColor(interactions.compliance_status)}>
                {interactions.compliance_status}
              </Badge>
              <Button 
                onClick={() => refetchClient()} 
                variant="outline" 
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Interactions */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {interactions.total_interactions?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Interactions</div>
              <div className="flex items-center justify-center mt-1">
                <Activity className="h-4 w-4 text-blue-500" />
              </div>
            </div>

            {/* Daily Interactions */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {interactions.daily_interactions?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-muted-foreground">Today</div>
              <div className="flex items-center justify-center mt-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </div>

            {/* Weekly Interactions */}
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {interactions.weekly_interactions?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-muted-foreground">This Week</div>
              <div className="flex items-center justify-center mt-1">
                <BarChart3 className="h-4 w-4 text-orange-500" />
              </div>
            </div>

            {/* Risk Score */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${getRiskColor(interactions.risk_score || 0)}`}>
                {interactions.risk_score || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Risk Score</div>
              <div className="flex items-center justify-center mt-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
            </div>
          </div>

          {/* Risk Score Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Risk Assessment</span>
              <span className="text-sm text-muted-foreground">
                {interactions.risk_score || 0}%
              </span>
            </div>
            <Progress 
              value={interactions.risk_score || 0} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interaction Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Interaction Trends (30 Days)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value) => [value, 'Interactions']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="interactions" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Applications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Top Applications</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topApps.slice(0, 5).map((app: any, index: number) => (
                <div key={app.application_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{app.application_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {app.vendor} • {app.type}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {app.total_interactions?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">interactions</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Application Details */}
      {topApps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Application Interaction Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topApps.map((app: any) => (
                <div key={app.application_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{app.application_name}</h4>
                    <Badge variant={app.status === 'Permitted' ? 'default' : 'destructive'}>
                      {app.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendor:</span>
                      <span>{app.vendor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{app.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interactions:</span>
                      <span className="font-medium">
                        {app.total_interactions?.toLocaleString() || 0}
                      </span>
                    </div>
                    {app.last_interaction && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Used:</span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(app.last_interaction).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* <div className="mt-4 flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedApp(app.application_id)}
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleIncrementInteraction(app.application_id)}
                      disabled={incrementMutation.isPending}
                    >
                      {incrementMutation.isPending ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        '+1 Interaction'
                      )}
                    </Button>
                  </div> */}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Application Details */}
      {selectedApp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Application Details</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedApp(null)}
              >
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Loading application details...</p>
              </div>
            ) : appError ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">Failed to load application details</p>
              </div>
            ) : appInteractions ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {appInteractions.daily_interactions || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {appInteractions.weekly_interactions || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">This Week</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {appInteractions.monthly_interactions || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">This Month</div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
