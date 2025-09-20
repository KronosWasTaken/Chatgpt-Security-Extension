import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Copy, Download } from "lucide-react";
import { sampleClientReport, samplePortfolioReport } from "@/data/reports";
import { clients } from "@/data/clients";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const [selectedClient, setSelectedClient] = useState('acme');
  const [selectedPeriod, setSelectedPeriod] = useState('q3-2025');
  const { toast } = useToast();

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.name
  }));

  const periodOptions = [
    { value: 'q3-2025', label: 'Q3 2025' },
    { value: 'q2-2025', label: 'Q2 2025' },
    { value: 'q1-2025', label: 'Q1 2025' },
  ];

  const handleExportPDF = () => {
    toast({
      title: "Export Not Available",
      description: "PDF export is available in Pro version",
      variant: "default"
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: "Report share link copied to clipboard",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-heading-text">Reports</h1>
        </div>

        <Tabs defaultValue="client-compliance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="client-compliance">Client Compliance Report</TabsTrigger>
            <TabsTrigger value="portfolio-value">MSP Portfolio Value Report</TabsTrigger>
          </TabsList>

          <TabsContent value="client-compliance" className="space-y-6">
            {/* Controls */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Client:</label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {clientOptions.map(client => (
                          <SelectItem key={client.value} value={client.value}>
                            {client.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Period:</label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {periodOptions.map(period => (
                          <SelectItem key={period.value} value={period.value}>
                            {period.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleExportPDF}
                      disabled
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Share Link
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Report Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coverage & Evidence */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Compliance Coverage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Control Coverage</span>
                      <span>{sampleClientReport.coverage.percentage}%</span>
                    </div>
                    <Progress value={sampleClientReport.coverage.percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {sampleClientReport.coverage.implemented} of {sampleClientReport.coverage.total} controls
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Evidence Collection</span>
                      <span>{sampleClientReport.evidence.percentage}%</span>
                    </div>
                    <Progress value={sampleClientReport.evidence.percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {sampleClientReport.evidence.complete} of {sampleClientReport.evidence.total} evidences
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alert Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Alert Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sampleClientReport.alertSummary.map((alert, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{alert.family}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{alert.count}</span>
                          <Badge 
                            className={
                              alert.severity === 'High' ? 'bg-risk-high text-white' :
                              alert.severity === 'Medium' ? 'bg-risk-medium text-white' :
                              'bg-risk-low text-white'
                            }
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Implemented Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Implemented Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sampleClientReport.implementedControls.map((control, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-risk-low rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{control}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Open Gaps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Open Gaps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sampleClientReport.openGaps.map((gap, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-risk-medium rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{gap}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Engagement Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sampleClientReport.engagementHighlights.topApps.map((app, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{app.name}</span>
                        <span className={`text-sm ${app.change > 0 ? 'text-cybercept-teal' : 'text-risk-high'}`}>
                          {app.change > 0 ? '+' : ''}{app.change.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Agents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sampleClientReport.engagementHighlights.topAgents.map((agent, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{agent.name}</span>
                        <span className={`text-sm ${agent.change > 0 ? 'text-cybercept-teal' : 'text-risk-high'}`}>
                          {agent.change > 0 ? '+' : ''}{agent.change.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Next Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Next 3 Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sampleClientReport.nextActions.map((action, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-cybercept-blue text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-sm">{action}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio-value" className="space-y-6">
            {/* Controls */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">
                    MSP Portfolio Value Report - {samplePortfolioReport.period}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleExportPDF}
                      disabled
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Share Link
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Portfolio Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Coverage Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-cybercept-teal">
                    +{samplePortfolioReport.coverageDelta}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Portfolio-wide compliance coverage increase
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {samplePortfolioReport.totalAlerts.reduce((sum, alert) => sum + alert.count, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Across all clients this period
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estimated Savings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-cybercept-teal">
                    {formatCurrency(
                      samplePortfolioReport.estimatedSavings.licenseOptimization +
                      samplePortfolioReport.estimatedSavings.riskReduction +
                      samplePortfolioReport.estimatedSavings.complianceEfficiency
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total client value delivered
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alert Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alert Distribution by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {samplePortfolioReport.totalAlerts.map((alert, index) => (
                    <div key={index} className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold">{alert.count}</div>
                      <div className="text-xs text-muted-foreground">{alert.family}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Standardizations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Standardizations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {samplePortfolioReport.topStandardizations.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-cybercept-teal rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Savings Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estimated Savings Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gradient-brand-subtle rounded-lg">
                    <span className="font-medium">License Optimization</span>
                    <span className="font-bold text-cybercept-blue">
                      {formatCurrency(samplePortfolioReport.estimatedSavings.licenseOptimization)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gradient-brand-subtle rounded-lg">
                    <span className="font-medium">Risk Reduction Value</span>
                    <span className="font-bold text-cybercept-blue">
                      {formatCurrency(samplePortfolioReport.estimatedSavings.riskReduction)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gradient-brand-subtle rounded-lg">
                    <span className="font-medium">Compliance Efficiency</span>
                    <span className="font-bold text-cybercept-blue">
                      {formatCurrency(samplePortfolioReport.estimatedSavings.complianceEfficiency)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Portfolio Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {samplePortfolioReport.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-cybercept-teal rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{highlight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Next Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Strategic Next Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {samplePortfolioReport.nextActions.map((action, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-cybercept-blue text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-sm">{action}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}