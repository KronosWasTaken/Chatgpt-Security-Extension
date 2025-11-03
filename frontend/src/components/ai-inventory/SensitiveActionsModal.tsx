import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Clock, User } from "lucide-react";

interface SensitiveAction {
  id: string;
  timestamp: string;
  user: string;
  department: string;
  action: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  details: string;
}

interface SensitiveActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  actions: SensitiveAction[];
}

// Mock data - will be replaced with API call
const mockSensitiveActions: SensitiveAction[] = [
  {
    id: "1",
    timestamp: "2024-12-15 14:23:15",
    user: "Sarah Johnson",
    department: "Finance",
    action: "Requested sensitive financial data export",
    riskLevel: "High",
    details: "Attempted to export confidential revenue projections for Q1 2025"
  },
  {
    id: "2", 
    timestamp: "2024-12-15 11:45:32",
    user: "Mike Chen",
    department: "HR",
    action: "Accessed employee personal information",
    riskLevel: "Medium",
    details: "Retrieved employee salary information without proper authorization"
  },
  {
    id: "3",
    timestamp: "2024-12-14 16:12:07",
    user: "Emily Davis",
    department: "Legal",
    action: "Generated legal document without review",
    riskLevel: "High",
    details: "Created contract terms that may violate compliance regulations"
  },
  {
    id: "4",
    timestamp: "2024-12-14 09:33:21",
    user: "John Smith",
    department: "IT",
    action: "Requested system configuration details",
    riskLevel: "Medium",
    details: "Asked for database connection strings and security protocols"
  }
];

const getRiskBadgeClass = (risk: string) => {
  switch (risk) {
    case 'High': return 'bg-risk-high text-white border-risk-high';
    case 'Medium': return 'bg-risk-medium text-white border-risk-medium';
    case 'Low': return 'bg-risk-low text-white border-risk-low';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function SensitiveActionsModal({ open, onOpenChange, agentName, actions }: SensitiveActionsModalProps) {
  // Use mock data for demo
  const displayActions = mockSensitiveActions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-risk-high" />
            Sensitive Actions - {agentName}
          </DialogTitle>
          <DialogDescription>
            Flagged actions that require MSP review and monitoring
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="rounded-lg border border-border-color overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[140px]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Timestamp
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      User
                    </div>
                  </TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="w-[100px]">Risk Level</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayActions.map((action) => (
                  <TableRow key={action.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-subtext">
                      {action.timestamp}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-heading-text">{action.user}</p>
                        <p className="text-xs text-subtext">{action.department}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {action.action}
                    </TableCell>
                    <TableCell>
                      <Badge className={getRiskBadgeClass(action.riskLevel)} variant="outline">
                        {action.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="text-sm text-body-text line-clamp-2">
                        {action.details}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>

        {displayActions.length === 0 && (
          <div className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-heading-text mb-2">No Sensitive Actions</h3>
            <p className="text-subtext">This agent has not triggered any sensitive action alerts.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}