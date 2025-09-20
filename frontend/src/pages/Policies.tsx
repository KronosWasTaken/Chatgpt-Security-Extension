import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { policyTemplates, PolicyTemplate, PolicyRule } from "@/data/templates";
import { clientPolicies, ClientPolicy } from "@/data/policies";
import { clients } from "@/data/clients";
import { useToast } from "@/hooks/use-toast";

export default function Policies() {
  const [selectedTemplate, setSelectedTemplate] = useState<PolicyTemplate | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedPolicy, setSelectedPolicy] = useState<ClientPolicy | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardClient, setWizardClient] = useState('');
  const [previewRules, setPreviewRules] = useState<PolicyRule[]>([]);
  const { toast } = useToast();

  const effectColors = {
    'Allow': 'bg-risk-low text-white',
    'Redact': 'bg-risk-medium text-white',
    'Block': 'bg-risk-high text-white'
  };

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.name
  }));

  const selectedClientPolicies = clientPolicies.filter(policy => 
    !selectedClient || policy.clientId === selectedClient
  );

  const handleApplyTemplate = (template: PolicyTemplate) => {
    setSelectedTemplate(template);
    setPreviewRules([...template.rules]);
    setWizardStep(1);
  };

  const handleWizardNext = () => {
    if (wizardStep === 1 && wizardClient) {
      setWizardStep(2);
    } else if (wizardStep === 2) {
      // Confirm step
      toast({
        title: "Policy Applied",
        description: `${selectedTemplate?.name} template applied to ${wizardClient}`,
      });
      setWizardStep(0);
      setSelectedTemplate(null);
      setWizardClient('');
      setPreviewRules([]);
    }
  };

  const handleRuleChange = (ruleId: string, field: string, value: any) => {
    setPreviewRules(rules => 
      rules.map(rule => 
        rule.id === ruleId ? { ...rule, [field]: value } : rule
      )
    );
  };

  const handleSimulate = () => {
    toast({
      title: "Policy Simulation",
      description: "Simulation completed. Results show 23 potential matches in test data.",
    });
  };

  const handleSave = () => {
    toast({
      title: "Policy Saved",
      description: "Client policy has been saved successfully.",
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-heading-text">Policy Center</h1>
        </div>

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="client-policies">Client Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {policyTemplates.map((template) => (
                <Card key={template.id} className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline" className="w-fit">
                      {template.industry}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                    <Button 
                      onClick={() => handleApplyTemplate(template)}
                      className="w-full"
                    >
                      Apply Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="client-policies" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Client Policies</CardTitle>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Clients</SelectItem>
                      {clientOptions.map(client => (
                        <SelectItem key={client.value} value={client.value}>
                          {client.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedClientPolicies.map((policy) => (
                  <Card key={policy.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{policy.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Client: {policy.clientId} • Modified: {new Date(policy.lastModified).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={policy.isActive ? "bg-risk-low text-white" : "bg-muted"}>
                          {policy.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedPolicy(policy)}
                        >
                          Configure
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Template Application Wizard */}
        <Dialog open={!!selectedTemplate} onOpenChange={() => {
          setSelectedTemplate(null);
          setWizardStep(0);
          setWizardClient('');
          setPreviewRules([]);
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Apply {selectedTemplate?.name} Template
                {wizardStep > 0 && ` - Step ${wizardStep} of 3`}
              </DialogTitle>
            </DialogHeader>

            {wizardStep === 0 && selectedTemplate && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.description}
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Client:</label>
                  <Select value={wizardClient} onValueChange={setWizardClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose client to apply template" />
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
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleWizardNext} disabled={!wizardClient}>
                    Next: Preview Rules
                  </Button>
                </div>
              </div>
            )}

            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Policy Rules</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Enabled</TableHead>
                          <TableHead>Effect</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRules.map((rule) => (
                          <TableRow key={rule.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{rule.category}</div>
                                <div className="text-xs text-muted-foreground">
                                  {rule.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={rule.enabled}
                                onCheckedChange={(checked) => 
                                  handleRuleChange(rule.id, 'enabled', checked)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={rule.effect}
                                onValueChange={(value) => 
                                  handleRuleChange(rule.id, 'effect', value)
                                }
                              >
                                <SelectTrigger className="w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Allow">Allow</SelectItem>
                                  <SelectItem value="Redact">Redact</SelectItem>
                                  <SelectItem value="Block">Block</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">YAML Preview</h3>
                    <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-[400px] font-mono">
                      {selectedTemplate?.yaml}
                    </pre>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setWizardStep(0)}>
                    Back
                  </Button>
                  <Button onClick={handleWizardNext}>
                    Next: Confirm
                  </Button>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Confirmation</h3>
                  <p className="text-sm">
                    Apply <strong>{selectedTemplate?.name}</strong> template to <strong>{wizardClient}</strong> with the configured rules?
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setWizardStep(1)}>
                    Back
                  </Button>
                  <Button onClick={handleWizardNext}>
                    Apply Template
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Policy Configuration Dialog */}
        <Dialog open={!!selectedPolicy} onOpenChange={() => setSelectedPolicy(null)}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPolicy?.name}</DialogTitle>
            </DialogHeader>

            {selectedPolicy && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Policy Rules</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleSimulate}>
                        Simulate
                      </Button>
                      <Button size="sm" onClick={handleSave}>
                        Save
                      </Button>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Enabled</TableHead>
                        <TableHead>Effect</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPolicy.rules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{rule.category}</div>
                              <div className="text-xs text-muted-foreground">
                                {rule.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch checked={rule.enabled} />
                          </TableCell>
                          <TableCell>
                            <Badge className={effectColors[rule.effect]}>
                              {rule.effect}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">YAML Configuration</h3>
                  <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-[500px] font-mono">
                    {selectedPolicy.yaml}
                  </pre>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}