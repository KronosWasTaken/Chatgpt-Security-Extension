import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertTriangle, XCircle, Eye, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { clients } from "@/data/clients";

const complianceData = {
  kpis: [
    { title: "Compliance Violations", value: 3, trend: "-2", icon: XCircle },
    { title: "Frameworks Met", value: 4, trend: "+1", icon: CheckCircle },
    { title: "Policies Aligned", value: 12, trend: "+3", icon: CheckCircle },
    { title: "High-Risk Violations", value: 1, trend: "0", icon: AlertTriangle },
  ],
  frameworks: [
    { name: "EU AI Act", status: "Compliant", lastReviewed: "2024-01-15", color: "bg-green-500" },
    { name: "NY AI Regulation", status: "Partial", lastReviewed: "2024-01-10", color: "bg-yellow-500" },
    { name: "NIST AI Framework", status: "Compliant", lastReviewed: "2024-01-12", color: "bg-green-500" },
    { name: "ISO/IEC 23053", status: "Gap", lastReviewed: "2024-01-08", color: "bg-red-500" },
  ],
  violations: [
    { 
      violation: "Unauthorized high-risk AI system deployment", 
      severity: "High", 
      application: "Claude AI", 
      dateDetected: "2024-01-14", 
      status: "Outstanding" 
    },
    { 
      violation: "Missing impact assessment documentation", 
      severity: "Medium", 
      application: "ChatGPT Enterprise", 
      dateDetected: "2024-01-12", 
      status: "Outstanding" 
    },
    { 
      violation: "Inadequate human oversight controls", 
      severity: "Low", 
      application: "GitHub Copilot", 
      dateDetected: "2024-01-10", 
      status: "Resolved" 
    },
  ]
};

export default function ClientCompliance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedClientId, setSelectedClientId] = useState(searchParams.get("client") || "1");
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    if (selectedClientId !== searchParams.get("client")) {
      setSearchParams({ client: selectedClientId });
    }
  }, [selectedClientId, searchParams, setSearchParams]);

  const selectedClient = clients.find(client => client.id === selectedClientId);
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "High": return "bg-red-500";
      case "Medium": return "bg-yellow-500";
      case "Low": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    return status === "Outstanding" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800";
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-app-bg">
        {/* Header Section */}
        <div className="bg-surface border-b border-border-color sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-heading-text">AI Compliance</h1>
                <p className="text-subtext text-sm mt-1">
                  {selectedClient?.name || "Select a client"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
        {/* KPI Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {complianceData.kpis.map((kpi, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                    <p className="text-3xl font-bold">{kpi.value}</p>
                  </div>
                  <kpi.icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="mt-4">
                  <span className="text-sm text-muted-foreground">
                    {kpi.trend.startsWith('+') ? '↗' : kpi.trend.startsWith('-') ? '↘' : '→'} {kpi.trend} vs. last 7 days
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Framework Alignment */}
        <Card>
          <CardHeader>
            <CardTitle>Framework Alignment</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Framework</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Reviewed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceData.frameworks.map((framework, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{framework.name}</TableCell>
                    <TableCell>
                      <Badge className={`${framework.color} text-white`}>
                        {framework.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{framework.lastReviewed}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Violations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Violation</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Application/Agent</TableHead>
                  <TableHead>Date Detected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceData.violations.map((violation, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{violation.violation}</TableCell>
                    <TableCell>
                      <Badge className={`${getSeverityColor(violation.severity)} text-white`}>
                        {violation.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{violation.application}</TableCell>
                    <TableCell>{violation.dateDetected}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(violation.status)}>
                        {violation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>
      </div>
    </AppLayout>
  );
}