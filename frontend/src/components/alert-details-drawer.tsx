import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertFamily, FrameworkTag } from "@/data/alerts";
import { formatDate } from "@/data/utils";
import { useToast } from "@/hooks/use-toast";

const familyLabels: Record<AlertFamily, string> = {
  'UNSANCTIONED_USE': 'Unsanctioned Use',
  'SENSITIVE_DATA': 'Sensitive Data',
  'AGENT_RISK': 'Agent Risk',
  'POLICY_VIOLATION': 'Policy Violation',
  'USAGE_ANOMALY': 'Usage Anomaly',
  'COMPLIANCE_GAP': 'Compliance Gap',
  'CONFIG_DRIFT': 'Config Drift',
  'ENFORCEMENT': 'Enforcement'
};

const frameworkLabels: Record<FrameworkTag, string> = {
  'NIST': 'NIST AI RMF',
  'EU_AI': 'EU AI Act',
  'ISO_42001': 'ISO 42001',
  'CO_SB21_169': 'Colorado SB21-169',
  'NYC_144': 'NYC Local Law 144'
};

const familyDefinitions: Record<AlertFamily, string> = {
  'UNSANCTIONED_USE': 'Detection of new or unapproved AI applications and agents being used without proper governance approval or outside established policies.',
  'SENSITIVE_DATA': 'Identification of personally identifiable information (PII), protected health information (PHI), payment card data (PCI), secrets, source code, or other confidential data in AI interactions.',
  'AGENT_RISK': 'AI agents performing privileged actions beyond their intended scope or violating segregation of duties (SoD) controls.',
  'POLICY_VIOLATION': 'AI system behavior that violates organizational policies including jailbreak attempts, toxic content generation, copyright infringement, bias, or regulated claims.',
  'USAGE_ANOMALY': 'Unusual patterns in AI system usage including spikes, off-hours activity, geographic anomalies, or unexpected departmental adoption.',
  'COMPLIANCE_GAP': 'Missing or incomplete compliance controls, overdue evidence collection, or regression in previously implemented governance measures.',
  'CONFIG_DRIFT': 'Changes to AI system configurations that may impact security posture, including disabled guardrails, reduced data retention, or new integrations.',
  'ENFORCEMENT': 'Actions taken by governance controls including blocking, redacting, warning users, or quarantining content.'
};

const severityColors = {
  'Low': 'bg-risk-low text-white',
  'Medium': 'bg-risk-medium text-white',
  'High': 'bg-risk-high text-white',
  'Critical': 'bg-destructive text-destructive-foreground'
};

const statusColors = {
  'Unassigned': 'bg-risk-high text-white',
  'Pending': 'bg-risk-medium text-white',
  'Complete': 'bg-risk-low text-white',
  'AI Resolved': 'bg-cybercept-teal text-white'
};

interface AlertDetailsDrawerProps {
  alert: Alert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AlertDetailsDrawer({ alert, open, onOpenChange }: AlertDetailsDrawerProps) {
  const [status, setStatus] = useState(alert?.status || 'Unassigned');
  const { toast } = useToast();

  if (!alert) return null;

  const handleAssign = (assignee: string) => {
    setStatus('Pending');
    toast({
      title: "Alert Assigned",
      description: `Alert assigned to ${assignee} and status updated to Pending`,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                Alert Details
                <Badge className={severityColors[alert.severity]}>
                  {alert.severity}
                </Badge>
              </SheetTitle>
              <SheetDescription>
                {formatDate(alert.ts)} • {alert.clientId} • {alert.assetKind}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              {status === 'Unassigned' ? (
                <Select onValueChange={handleAssign}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Assign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sarah-chen">Sarah Chen</SelectItem>
                    <SelectItem value="mike-johnson">Mike Johnson</SelectItem>
                    <SelectItem value="alex-wong">Alex Wong</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={statusColors[status]}>
                  {status}
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Alert Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alert Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Family</div>
                  <div className="font-medium">{familyLabels[alert.family]}</div>
                </div>
                {alert.subtype && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Subtype</div>
                    <div className="font-medium">{alert.subtype}</div>
                  </div>
                )}
                {alert.app && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Application/Agent</div>
                    <div className="font-medium">{alert.app}</div>
                  </div>
                )}
                {alert.usersAffected && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Users Affected</div>
                    <div className="font-medium">{alert.usersAffected}</div>
                  </div>
                )}
                {alert.count && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Interactions</div>
                    <div className="font-medium">{alert.count}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Definition */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Definition</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {familyDefinitions[alert.family]}
              </p>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alert Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-mono bg-muted p-3 rounded-md">
                {alert.details}
              </p>
            </CardContent>
          </Card>

          {/* Compliance Frameworks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mapped Frameworks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {alert.frameworks.map(framework => (
                  <Badge
                    key={framework}
                    variant="outline"
                    className="px-3 py-1"
                  >
                    {frameworkLabels[framework]}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}