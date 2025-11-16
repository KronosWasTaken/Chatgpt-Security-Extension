export interface ActionItem {
  id: string;
  action: string;
  appOrAgent: string;
  vendor: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedTo?: string;
  dateCreated: string;
  status: 'Outstanding' | 'In Progress' | 'Completed';
  description: string;
}

export interface UnsanctionedApp {
  id: string;
  name: string;
  vendor: string;
  icon: string;
  users: number;
  interactions: number;
  riskAssessment: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
}

export interface FlaggedAgent {
  id: string;
  name: string;
  vendor: string;
  deployed: number;
  flaggedActions: number;
  lastActivity: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  flaggedPrompts: string[];
  departmentsAffected: string[];
}

export interface ArchivedAction {
  id: string;
  name: string;
  vendor: string;
  type: 'Application' | 'Agent';
  dateBlocked: string;
  actionTaken: string;
  notes: string;
}

export const actionQueue: ActionItem[] = [
  {
    id: "aq-001",
    action: "Review Application",
    appOrAgent: "Perplexity",
    vendor: "Perplexity AI",
    riskLevel: "High",
    assignedTo: undefined,
    dateCreated: "2025-09-09",
    status: "Outstanding",
    description: "Unsanctioned application with 42 active users requires approval decision"
  },
  {
    id: "aq-002", 
    action: "Investigate Agent Risk",
    appOrAgent: "SmartScheduler",
    vendor: "AI Solutions",
    riskLevel: "High",
    assignedTo: "Sarah Chen",
    dateCreated: "2025-09-09",
    status: "In Progress",
    description: "Agent attempted privileged actions outside defined scope"
  },
  {
    id: "aq-003",
    action: "Address Config Drift",
    appOrAgent: "Agentforce",
    vendor: "Salesforce",
    riskLevel: "Critical",
    assignedTo: undefined,
    dateCreated: "2025-09-05",
    status: "Outstanding", 
    description: "PII redaction guardrail was disabled - immediate attention required"
  },
  {
    id: "aq-004",
    action: "Review Policy Violation",
    appOrAgent: "Workday AI",
    vendor: "Workday",
    riskLevel: "High",
    assignedTo: "Mike Rodriguez",
    dateCreated: "2025-08-31",
    status: "In Progress",
    description: "Potentially discriminatory language in screening prompts"
  }
];

export const unsanctionedApps: UnsanctionedApp[] = [
  {
    id: "unsan-001",
    name: "Perplexity",
    vendor: "Perplexity AI",
    icon: "",
    users: 42,
    interactions: 1284,
    riskAssessment: "High",
    description: "Search-focused AI tool with citation capabilities"
  },
  {
    id: "unsan-002",
    name: "Claude",
    vendor: "Anthropic", 
    icon: "",
    users: 23,
    interactions: 456,
    riskAssessment: "Medium",
    description: "Advanced AI assistant with strong safety features"
  },
  {
    id: "unsan-003",
    name: "Google Gemini",
    vendor: "Google",
    icon: "",
    users: 67,
    interactions: 1234,
    riskAssessment: "Medium", 
    description: "Google's multimodal AI with integrated workspace tools"
  }
];

export const flaggedAgents: FlaggedAgent[] = [
  {
    id: "flag-001",
    name: "SmartScheduler",
    vendor: "AI Solutions",
    deployed: 3,
    flaggedActions: 8,
    lastActivity: "2025-09-09",
    riskLevel: "High",
    flaggedPrompts: [
      "reset admin password for user@domain.com",
      "delete all calendar events for department",
      "grant manager permissions to temp user"
    ],
    departmentsAffected: ["IT", "HR", "Finance"]
  },
  {
    id: "flag-002", 
    name: "Agentforce",
    vendor: "Salesforce",
    deployed: 5,
    flaggedActions: 12,
    lastActivity: "2025-09-02",
    riskLevel: "Critical",
    flaggedPrompts: [
      "disable MFA for VIP user account", 
      "approve and audit same expense request",
      "export all customer contact data"
    ],
    departmentsAffected: ["Sales", "Finance", "Security"]
  },
  {
    id: "flag-003",
    name: "MedAssist AI", 
    vendor: "HealthTech Inc",
    deployed: 2,
    flaggedActions: 3,
    lastActivity: "2025-09-08",
    riskLevel: "Medium",
    flaggedPrompts: [
      "access patient records without authorization",
      "share PHI data in chat response"
    ],
    departmentsAffected: ["Clinical", "Compliance"]
  }
];

export const archivedActions: ArchivedAction[] = [
  {
    id: "arch-001",
    name: "Midjourney",
    vendor: "Midjourney Inc",
    type: "Application",
    dateBlocked: "2025-08-15",
    actionTaken: "Blocked - Unlicensed image generation",
    notes: "Users redirected to approved design tools"
  },
  {
    id: "arch-002", 
    name: "AutoApprover Bot",
    vendor: "Custom Development",
    type: "Agent", 
    dateBlocked: "2025-07-22",
    actionTaken: "Quarantined - SOD violations",
    notes: "Agent disabled pending workflow redesign"
  },
  {
    id: "arch-003",
    name: "Jasper AI",
    vendor: "Jasper",
    type: "Application",
    dateBlocked: "2025-06-30", 
    actionTaken: "Blocked - Data residency concerns",
    notes: "Replaced with compliant content generation tool"
  }
];