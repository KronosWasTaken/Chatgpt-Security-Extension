import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { Shield, CheckCircle, XCircle, AlertTriangle, User, Clock, UserCheck, Filter, Calendar, Target, Users, ChevronDown } from "lucide-react";
import { useState } from "react";

const mockActionLog = [
  {
    id: "1",
    action: "Blocked Application",
    target: "TikTok AI Assistant",
    vendor: "ByteDance",
    type: "Application",
    assignedTo: "Sarah Chen",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    timeCompleted: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    status: "Complete",
    severity: "High",
    actionType: "security",
    description: "Application was flagged for potential data exfiltration to unauthorized servers. Immediate blocking was required to prevent sensitive client data exposure.",
    impact: "Prevented potential HIPAA violation and data breach affecting 10,000+ patient records",
    nextSteps: "Monitor for similar applications and update security policies"
  },
  {
    id: "2", 
    action: "Approved Application",
    target: "GitHub Copilot",
    vendor: "Microsoft",
    type: "Application",
    assignedTo: "Mike Johnson",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    timeCompleted: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    status: "Complete",
    severity: "Low",
    actionType: "approval",
    description: "Development team requested approval for GitHub Copilot to assist with code completion and documentation.",
    impact: "Enhanced developer productivity while maintaining code security standards",
    nextSteps: "Monitor usage patterns and conduct quarterly security review"
  },
  {
    id: "3",
    action: "High Risk Agent Flagged",
    target: "Custom GPT Bot",
    vendor: "OpenAI",
    type: "Agent",
    assignedTo: "Sarah Chen", 
    date: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    timeCompleted: null,
    status: "Pending",
    severity: "High",
    actionType: "alert",
    description: "AI agent detected accessing sensitive financial records without proper authorization. Requires immediate investigation and potential containment.",
    impact: "Potential compliance violation and unauthorized access to financial data",
    nextSteps: "Investigate access patterns, review permissions, implement additional controls"
  },
  {
    id: "4",
    action: "Review Required",
    target: "Notion AI",
    vendor: "Notion Labs",
    type: "Application",
    assignedTo: "Unassigned",
    date: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    timeCompleted: null,
    status: "Unassigned",
    severity: "Medium",
    actionType: "review",
    description: "New AI features detected in Notion workspace. Requires security assessment before allowing full organizational access.",
    impact: "Could affect document security and compliance if left unchecked",
    nextSteps: "Assign security analyst to evaluate features and create usage guidelines"
  },
  {
    id: "5",
    action: "Agent Deployment Review",
    target: "Slack AI Assistant",
    vendor: "Slack",
    type: "Agent",
    assignedTo: "Unassigned",
    date: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    timeCompleted: null,
    status: "Unassigned",
    severity: "Medium",
    actionType: "review",
    description: "Slack has deployed new AI assistant features that can analyze message content and provide automated responses.",
    impact: "May process confidential communications and require privacy controls",
    nextSteps: "Review privacy settings, configure data retention policies, train users"
  },
  {
    id: "6",
    action: "Data Access Alert",
    target: "Claude AI",
    vendor: "Anthropic",
    type: "Agent",
    assignedTo: "Alex Wong",
    date: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
    timeCompleted: new Date(Date.now() - 1000 * 60 * 60 * 1), // 1 hour ago
    status: "Complete",
    severity: "High",
    actionType: "security",
    description: "Claude AI was found to have access to client database through unsecured API connection. Connection has been severed and security patches applied.",
    impact: "Potential exposure of client PII and financial information contained",
    nextSteps: "Audit all AI system database connections and implement zero-trust architecture"
  },
  {
    id: "7",
    action: "Policy Compliance Check",
    target: "Microsoft Copilot",
    vendor: "Microsoft",
    type: "Application",
    assignedTo: "Sarah Chen",
    date: new Date(Date.now() - 1000 * 60 * 60 * 16), // 16 hours ago
    timeCompleted: null,
    status: "Pending",
    severity: "Low",
    actionType: "compliance",
    description: "Routine quarterly compliance check for Microsoft Copilot usage across development teams.",
    impact: "Ensures continued compliance with software development security standards",
    nextSteps: "Complete security questionnaire and update usage documentation"
  }
];

export function ActionLogPanel() {
  const [statusFilter, setStatusFilter] = useState<string[]>(["Unassigned", "Pending", "Complete"]);
  const [selectedAction, setSelectedAction] = useState<typeof mockActionLog[0] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter and sort actions based on selected statuses
  const filteredActions = mockActionLog
    .filter(action => {
      return statusFilter.includes(action.status);
    })
    .sort((a, b) => {
      // Primary sort: Status priority (Unassigned -> Pending -> Complete)
      const statusOrder = { "Unassigned": 0, "Pending": 1, "Complete": 2 };
      const statusDiff = statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
      
      if (statusDiff !== 0) return statusDiff;
      
      // Secondary sort: Severity priority (High -> Medium -> Low)
      const severityOrder = { "High": 0, "Medium": 1, "Low": 2 };
      return severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder];
    });

  const handleRowClick = (action: typeof mockActionLog[0]) => {
    setSelectedAction(action);
    setModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Complete':
        return <CheckCircle className="w-4 h-4 text-cybercept-teal" />;
      case 'Pending':
        return <Clock className="w-4 h-4 text-risk-medium" />;
      case 'Unassigned':
        return <UserCheck className="w-4 h-4 text-risk-high" />;
      default:
        return <XCircle className="w-4 h-4 text-risk-high" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'bg-cybercept-teal/10 text-cybercept-teal border-cybercept-teal/20';
      case 'Pending':
        return 'bg-risk-medium/10 text-risk-medium border-risk-medium/20';
      case 'Unassigned':
        return 'bg-risk-high/10 text-risk-high border-risk-high/20';
      default:
        return 'bg-subtext/10 text-subtext border-subtext/20';
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'High':
        return 'bg-risk-high text-white';
      case 'Medium':
        return 'bg-risk-medium text-white';
      case 'Low':
        return 'bg-cybercept-teal text-white';
      default:
        return 'bg-subtext text-white';
    }
  };

  const handleAssignOwner = (actionId: string, owner: string) => {
    // Handle assignment logic
    console.log(`Assigning ${owner} to action ${actionId}`);
  };

  const handleRemediate = (actionId: string) => {
    // Handle remediation logic
    console.log(`Remediating action ${actionId}`);
  };

  return (
    <Card className="bg-surface border border-border-color shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-heading-text">Admin Actions</CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48 justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  {statusFilter.length === 3 ? "All Status" : `${statusFilter.length} Selected`}
                </div>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0">
              <div className="p-2 space-y-2">
                {["Unassigned", "Pending", "Complete"].map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={status}
                      checked={statusFilter.includes(status)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setStatusFilter([...statusFilter, status]);
                        } else {
                          setStatusFilter(statusFilter.filter(s => s !== status));
                        }
                      }}
                    />
                    <label
                      htmlFor={status}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border-color">
              <TableHead className="text-subtext font-medium">Action / Task</TableHead>
              <TableHead className="text-subtext font-medium">Application / Agent</TableHead>
              <TableHead className="text-subtext font-medium">Type</TableHead>
              <TableHead className="text-subtext font-medium">Severity</TableHead>
              <TableHead className="text-subtext font-medium">Assigned To</TableHead>
              <TableHead className="text-subtext font-medium">Time Created</TableHead>
              <TableHead className="text-subtext font-medium">Status</TableHead>
              <TableHead className="text-subtext font-medium">Time Complete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredActions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-subtext">
                  No actions found for the selected status
                </TableCell>
              </TableRow>
            ) : (
              filteredActions.map((action) => (
                <TableRow 
                  key={action.id} 
                  className={`border-b border-border-color/50 cursor-pointer hover:bg-muted/30 transition-colors ${
                    action.status === 'Unassigned' ? 'bg-risk-high/5' : 
                    action.status === 'Pending' ? 'bg-risk-medium/5' : 'bg-app-bg/50'
                  }`}
                  onClick={() => handleRowClick(action)}
                >
                  <TableCell className="py-3">
                    <span className="font-medium text-heading-text">{action.action}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    <div>
                      <div className="font-medium text-heading-text">{action.target}</div>
                      <div className="text-sm text-subtext">{action.vendor}</div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className="text-xs">
                      {action.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge className={getSeverityBadgeClass(action.severity)}>
                      {action.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    {action.status === 'Unassigned' || action.assignedTo === 'Unassigned' ? (
                      <Select onValueChange={(value) => handleAssignOwner(action.id, value)}>
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue placeholder="Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sarah-chen">Sarah Chen</SelectItem>
                          <SelectItem value="mike-johnson">Mike Johnson</SelectItem>
                          <SelectItem value="alex-wong">Alex Wong</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-body-text">{action.assignedTo}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-body-text">
                    {formatDistanceToNow(action.date, { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeClass(action.status)}>
                      {action.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-body-text">
                    {action.timeCompleted ? formatDistanceToNow(action.timeCompleted, { addSuffix: true }) : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Action Details Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getStatusIcon(selectedAction?.status || '')}
              {selectedAction?.action}
            </DialogTitle>
            <DialogDescription>
              Action details and next steps
            </DialogDescription>
          </DialogHeader>

          {selectedAction && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-heading-text mb-2 flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      Target Application/Agent
                    </h4>
                    <div>
                      <div className="font-medium">{selectedAction.target}</div>
                      <div className="text-sm text-subtext">{selectedAction.vendor}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-heading-text mb-2 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Assigned To
                    </h4>
                    <div className="text-body-text">{selectedAction.assignedTo}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-heading-text mb-2">Status & Severity</h4>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusBadgeClass(selectedAction.status)}>
                        {selectedAction.status}
                      </Badge>
                      <Badge className={getSeverityBadgeClass(selectedAction.severity)}>
                        {selectedAction.severity} Priority
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-heading-text mb-2 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Timeline
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div>Created: {formatDistanceToNow(selectedAction.date, { addSuffix: true })}</div>
                      {selectedAction.timeCompleted && (
                        <div>Completed: {formatDistanceToNow(selectedAction.timeCompleted, { addSuffix: true })}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-heading-text mb-2">Description</h4>
                <p className="text-body-text">{selectedAction.description}</p>
              </div>

              {/* Impact */}
              <div>
                <h4 className="text-sm font-semibold text-heading-text mb-2">Impact Assessment</h4>
                <p className="text-body-text">{selectedAction.impact}</p>
              </div>

              {/* Next Steps */}
              <div>
                <h4 className="text-sm font-semibold text-heading-text mb-2">Next Steps</h4>
                <p className="text-body-text">{selectedAction.nextSteps}</p>
              </div>

              {/* Action Buttons */}
              {selectedAction.status !== 'Complete' && (
                <div className="flex items-center gap-2 pt-4 border-t">
                  {selectedAction.status === 'Unassigned' && (
                    <Button className="bg-cybercept-blue hover:bg-cybercept-blue/90">
                      Assign to Me
                    </Button>
                  )}
                  {selectedAction.status === 'Pending' && (
                    <>
                      <Button className="bg-cybercept-teal hover:bg-cybercept-teal/90">
                        Mark Complete
                      </Button>
                      <Button variant="outline">
                        Add Note
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}