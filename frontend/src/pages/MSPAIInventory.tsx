import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiClient, AIApplication } from "@/services/api";
import { useEffect, useState } from "react";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";

export default function MSPAIInventory() {
  const [applications, setApplications] = useState<AIApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadApplications = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiClient.getAIInventory();
        setApplications(data);
      } catch (err) {
        console.error('Failed to load AI applications:', err);
        setError('Failed to load AI applications');
      } finally {
        setIsLoading(false);
      }
    };

    loadApplications();
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Permitted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Unsanctioned':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Under_Review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Blocked':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskBadgeClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (error) {
    return (
      <AppLayout headerTitle="MSP AI Inventory">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-heading-text mb-2">Error Loading AI Inventory</h3>
            <p className="text-body-text mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-cybercept-blue text-white rounded-lg hover:bg-cybercept-blue/90"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout headerTitle="MSP AI Inventory">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-heading-text">AI Inventory Management</h2>
            <p className="text-body-text">
              Manage and track AI applications across your client portfolio
            </p>
          </div>
          <Button className="bg-cybercept-blue hover:bg-cybercept-blue/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Application
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-subtext">Total Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-heading-text">
                {isLoading ? <Skeleton className="h-8 w-16" /> : applications.length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-subtext">Permitted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {isLoading ? <Skeleton className="h-8 w-16" /> : applications.filter(app => app.status === 'Permitted').length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-subtext">Under Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {isLoading ? <Skeleton className="h-8 w-16" /> : applications.filter(app => app.status === 'Under_Review').length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-subtext">Blocked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {isLoading ? <Skeleton className="h-8 w-16" /> : applications.filter(app => app.status === 'Blocked').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Applications Table */}
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="text-heading-text">AI Applications</CardTitle>
            <CardDescription>
              Manage AI applications and their approval status across your portfolio
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold">Application</TableHead>
                      <TableHead className="font-semibold">Vendor</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold text-center">Status</TableHead>
                      <TableHead className="font-semibold text-center">Risk Level</TableHead>
                      <TableHead className="font-semibold text-center">Active Users</TableHead>
                      <TableHead className="font-semibold text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium text-heading-text">
                          {app.name}
                        </TableCell>
                        <TableCell className="text-body-text">
                          {app.vendor}
                        </TableCell>
                        <TableCell className="text-body-text">
                          {app.type}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getStatusBadgeClass(app.status)}>
                            {app.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getRiskBadgeClass(app.risk_level)}>
                            {app.risk_level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {app.active_users}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}