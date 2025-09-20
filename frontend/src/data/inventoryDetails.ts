// Extended inventory data for detailed popup view
export interface InventoryUser {
  name: string;
  department: string;
  interactions: number;
}

export interface AIInteraction {
  user: string;
  department: string;
  timestamp: string;
  details: string;
}

export interface InventoryDetail {
  id: string;
  applicationName: string; // Works for both applications and agents
  vendor: string;
  status: 'Permitted' | 'Unsanctioned';
  activeUsers: number;
  activeUsersDelta: number; // change over 7 days
  interactions: number;
  interactionsDelta: number; // change over 7 days
  integrations: string[];
  topUsers: InventoryUser[];
  riskAssessment: {
    level: 'Low' | 'Medium' | 'High';
    score: number;
    factors: string[];
  };
  recentInteractions: AIInteraction[];
}

export const inventoryDetails: InventoryDetail[] = [
  {
    id: "chatgpt-app",
    applicationName: "ChatGPT",
    vendor: "OpenAI",
    status: "Permitted",
    activeUsers: 145,
    activeUsersDelta: 12,
    interactions: 2890,
    interactionsDelta: 340,
    integrations: ["Salesforce", "Outlook"],
    topUsers: [
      { name: "Sarah Johnson", department: "Marketing", interactions: 234 },
      { name: "Mike Chen", department: "Sales", interactions: 189 },
      { name: "Lisa Rodriguez", department: "HR", interactions: 167 }
    ],
    riskAssessment: {
      level: "Medium",
      score: 65,
      factors: [
        "High usage volume",
        "Multiple integrations",
        "Some sensitive data access"
      ]
    },
    recentInteractions: [
      {
        user: "Sarah Johnson",
        department: "Marketing",
        timestamp: "2024-01-10 14:32",
        details: "Generated marketing copy for Q1 campaign"
      },
      {
        user: "Mike Chen", 
        department: "Sales",
        timestamp: "2024-01-10 13:45",
        details: "Created customer proposal template"
      },
      {
        user: "Lisa Rodriguez",
        department: "HR",
        timestamp: "2024-01-10 11:28",
        details: "Drafted employee handbook updates"
      },
      {
        user: "Tom Wilson",
        department: "IT",
        timestamp: "2024-01-10 10:15",
        details: "Generated technical documentation"
      },
      {
        user: "Amy Davis",
        department: "Finance",
        timestamp: "2024-01-10 09:42",
        details: "Created monthly report summary"
      }
    ]
  },
  {
    id: "copilot-app",
    applicationName: "Microsoft Copilot",
    vendor: "Microsoft",
    status: "Permitted",
    activeUsers: 98,
    activeUsersDelta: 8,
    interactions: 1567,
    interactionsDelta: 123,
    integrations: ["Outlook", "SharePoint"],
    topUsers: [
      { name: "John Smith", department: "Engineering", interactions: 156 },
      { name: "Emma Wilson", department: "Product", interactions: 134 },
      { name: "David Lee", department: "Design", interactions: 112 }
    ],
    riskAssessment: {
      level: "Low",
      score: 35,
      factors: [
        "Enterprise integration",
        "Built-in security controls",
        "Moderate usage volume"
      ]
    },
    recentInteractions: [
      {
        user: "John Smith",
        department: "Engineering",
        timestamp: "2024-01-10 15:20",
        details: "Code review and optimization suggestions"
      },
      {
        user: "Emma Wilson",
        department: "Product",
        timestamp: "2024-01-10 14:35",
        details: "Product requirements documentation"
      },
      {
        user: "David Lee",
        department: "Design",
        timestamp: "2024-01-10 13:18",
        details: "UI/UX design feedback and iterations"
      }
    ]
  },
  {
    id: "claude-app",
    applicationName: "Claude",
    vendor: "Anthropic",
    status: "Unsanctioned",
    activeUsers: 23,
    activeUsersDelta: -2,
    interactions: 456,
    interactionsDelta: -45,
    integrations: [],
    topUsers: [
      { name: "Alex Brown", department: "Research", interactions: 89 },
      { name: "Jessica Taylor", department: "Legal", interactions: 67 },
      { name: "Ryan Anderson", department: "Strategy", interactions: 54 }
    ],
    riskAssessment: {
      level: "High",
      score: 85,
      factors: [
        "Unsanctioned usage",
        "No enterprise controls",
        "Potential data leakage",
        "Compliance violations"
      ]
    },
    recentInteractions: [
      {
        user: "Alex Brown",
        department: "Research",
        timestamp: "2024-01-10 16:45",
        details: "Market research analysis and insights"
      },
      {
        user: "Jessica Taylor",
        department: "Legal",
        timestamp: "2024-01-10 15:30",
        details: "Contract review and legal analysis"
      },
      {
        user: "Ryan Anderson",
        department: "Strategy",
        timestamp: "2024-01-10 14:22",
        details: "Strategic planning and competitive analysis"
      }
    ]
  },
  // AI Agents
  {
    id: "medical-ai-agent",
    applicationName: "MedAssist AI",
    vendor: "HealthTech Inc",
    status: "Permitted",
    activeUsers: 67,
    activeUsersDelta: 5,
    interactions: 1234,
    interactionsDelta: 87,
    integrations: ["Epic", "Salesforce"],
    topUsers: [
      { name: "Dr. Sarah Johnson", department: "Emergency Medicine", interactions: 345 },
      { name: "Nurse Patricia Williams", department: "ICU", interactions: 289 },
      { name: "Dr. Michael Chen", department: "Cardiology", interactions: 234 }
    ],
    riskAssessment: {
      level: "Low",
      score: 25,
      factors: [
        "HIPAA compliant",
        "Enterprise medical integration", 
        "Regulated healthcare environment",
        "Audit trail enabled"
      ]
    },
    recentInteractions: [
      {
        user: "Dr. Sarah Johnson",
        department: "Emergency Medicine",
        timestamp: "2024-01-10 16:22",
        details: "Assisted with patient diagnostic recommendations"
      },
      {
        user: "Nurse Patricia Williams",
        department: "ICU",
        timestamp: "2024-01-10 15:45",
        details: "Generated patient care plan updates"
      },
      {
        user: "Dr. Michael Chen",
        department: "Cardiology",
        timestamp: "2024-01-10 14:30",
        details: "Analyzed cardiac test results and risk factors"
      },
      {
        user: "Dr. Lisa Martinez",
        department: "Internal Medicine",
        timestamp: "2024-01-10 13:12",
        details: "Created treatment protocol recommendations"
      },
      {
        user: "Nurse Robert Taylor",
        department: "Surgery",
        timestamp: "2024-01-10 11:08",
        details: "Assisted with pre-operative assessment"
      }
    ]
  },
  {
    id: "scheduling-agent",
    applicationName: "SmartScheduler",
    vendor: "AI Solutions",
    status: "Permitted",
    activeUsers: 189,
    activeUsersDelta: 23,
    interactions: 3456,
    interactionsDelta: 412,
    integrations: ["Outlook", "Gmail"],
    topUsers: [
      { name: "Jennifer Adams", department: "Administration", interactions: 567 },
      { name: "Mark Thompson", department: "Patient Services", interactions: 445 },
      { name: "Susan White", department: "Reception", interactions: 389 }
    ],
    riskAssessment: {
      level: "Low",
      score: 30,
      factors: [
        "Calendar integration only",
        "No sensitive data processing",
        "Standard email protocols",
        "Limited data retention"
      ]
    },
    recentInteractions: [
      {
        user: "Jennifer Adams",
        department: "Administration",
        timestamp: "2024-01-10 16:45",
        details: "Scheduled doctor appointments for next week"
      },
      {
        user: "Mark Thompson",
        department: "Patient Services",
        timestamp: "2024-01-10 16:12",
        details: "Rescheduled multiple patient consultations"
      },
      {
        user: "Susan White",
        department: "Reception",
        timestamp: "2024-01-10 15:30",
        details: "Automated reminder calls for upcoming appointments"
      },
      {
        user: "Carol Brown",
        department: "Nursing",
        timestamp: "2024-01-10 14:22",
        details: "Coordinated shift scheduling with staff availability"
      },
      {
        user: "David Kim",
        department: "Finance",
        timestamp: "2024-01-10 13:15",
        details: "Scheduled budget review meetings"
      }
    ]
  },
  {
    id: "billing-agent",
    applicationName: "BillBot Pro",
    vendor: "FinanceAI",
    status: "Permitted",
    activeUsers: 34,
    activeUsersDelta: -2,
    interactions: 890,
    interactionsDelta: -67,
    integrations: ["QuickBooks", "Salesforce"],
    topUsers: [
      { name: "David Kim", department: "Finance", interactions: 234 },
      { name: "Maria Gonzalez", department: "Billing", interactions: 189 },
      { name: "Robert Johnson", department: "Accounting", interactions: 156 }
    ],
    riskAssessment: {
      level: "Medium",
      score: 55,
      factors: [
        "Financial data processing",
        "Payment information access",
        "Insurance claim handling",
        "Requires PCI compliance monitoring"
      ]
    },
    recentInteractions: [
      {
        user: "David Kim",
        department: "Finance",
        timestamp: "2024-01-10 16:30",
        details: "Generated monthly billing reports and analytics"
      },
      {
        user: "Maria Gonzalez",
        department: "Billing",
        timestamp: "2024-01-10 15:45",
        details: "Processed insurance claims and payment reconciliation"
      },
      {
        user: "Robert Johnson",
        department: "Accounting",
        timestamp: "2024-01-10 14:20",
        details: "Automated invoice generation and payment tracking"
      },
      {
        user: "Linda Davis",
        department: "Revenue Cycle",
        timestamp: "2024-01-10 13:10",
        details: "Analyzed denial patterns and recovery opportunities"
      },
      {
        user: "James Wilson",
        department: "Collections",
        timestamp: "2024-01-10 11:45",
        details: "Generated overdue payment notifications and follow-ups"
      }
    ]
  }
];

export const getInventoryDetail = (itemId: string): InventoryDetail | null => {
  return inventoryDetails.find(detail => detail.id === itemId) || null;
};