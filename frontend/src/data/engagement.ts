export interface EngagementItem {
  name: string;
  vendor?: string;
  department?: string; // for users only
  avgDailyInteractions: number;
  delta7dPct: number; // percentage change vs last 7 days
}

export interface ClientEngagement {
  clientId: string;
  topAppsDaily: EngagementItem[];
  topAgentsDaily: EngagementItem[];
  topUsersDaily: EngagementItem[];
}

export const engagementData: ClientEngagement[] = [
  {
    clientId: "acme-health",
    topAppsDaily: [
      { name: "ChatGPT", vendor: "OpenAI", avgDailyInteractions: 2890, delta7dPct: 12.5 },
      { name: "Microsoft Copilot", vendor: "Microsoft", avgDailyInteractions: 1567, delta7dPct: -3.2 },
      { name: "Claude", vendor: "Anthropic", avgDailyInteractions: 456, delta7dPct: 8.7 },
      { name: "Bard", vendor: "Google", avgDailyInteractions: 234, delta7dPct: -12.1 },
      { name: "Perplexity", vendor: "Perplexity", avgDailyInteractions: 189, delta7dPct: 24.3 }
    ],
    topAgentsDaily: [
      { name: "SmartScheduler", vendor: "AI Solutions", avgDailyInteractions: 3456, delta7dPct: 18.7 },
      { name: "MedAssist AI", vendor: "HealthTech Inc", avgDailyInteractions: 1234, delta7dPct: 5.4 },
      { name: "BillBot Pro", vendor: "FinanceAI", avgDailyInteractions: 890, delta7dPct: -2.1 },
      { name: "PatientCare Bot", vendor: "HealthAI", avgDailyInteractions: 567, delta7dPct: 15.2 },
      { name: "Insurance Agent", vendor: "InsureTech", avgDailyInteractions: 432, delta7dPct: -8.9 }
    ],
    topUsersDaily: [
      { name: "Dr. Sarah Johnson", department: "Emergency Medicine", avgDailyInteractions: 157, delta7dPct: 22.1 },
      { name: "Mike Chen", department: "IT Operations", avgDailyInteractions: 134, delta7dPct: -5.7 },
      { name: "Lisa Rodriguez", department: "Human Resources", avgDailyInteractions: 128, delta7dPct: 8.3 },
      { name: "David Kim", department: "Finance", avgDailyInteractions: 119, delta7dPct: 12.9 },
      { name: "Emily Watson", department: "Patient Services", avgDailyInteractions: 107, delta7dPct: -3.4 }
    ]
  },
  {
    clientId: "techcorp-solutions",
    topAppsDaily: [
      { name: "GitHub Copilot", vendor: "GitHub", avgDailyInteractions: 5670, delta7dPct: 15.3 },
      { name: "ChatGPT Plus", vendor: "OpenAI", avgDailyInteractions: 3210, delta7dPct: 8.7 },
      { name: "Google Gemini", vendor: "Google", avgDailyInteractions: 1234, delta7dPct: -4.2 },
      { name: "Claude", vendor: "Anthropic", avgDailyInteractions: 987, delta7dPct: 19.8 },
      { name: "Cursor", vendor: "Cursor", avgDailyInteractions: 765, delta7dPct: 31.2 }
    ],
    topAgentsDaily: [
      { name: "CodeReviewer AI", vendor: "DevAI Corp", avgDailyInteractions: 1890, delta7dPct: 12.4 },
      { name: "TestBot Pro", vendor: "QA Solutions", avgDailyInteractions: 1456, delta7dPct: 7.8 },
      { name: "DeployAgent", vendor: "DevOps AI", avgDailyInteractions: 1123, delta7dPct: -2.3 },
      { name: "BugFinder", vendor: "Debug Inc", avgDailyInteractions: 890, delta7dPct: 23.7 },
      { name: "DocGen AI", vendor: "Doc Solutions", avgDailyInteractions: 678, delta7dPct: 9.1 }
    ],
    topUsersDaily: [
      { name: "Alex Turner", department: "Engineering", avgDailyInteractions: 289, delta7dPct: 18.5 },
      { name: "Maria Garcia", department: "Product Management", avgDailyInteractions: 267, delta7dPct: 12.3 },
      { name: "James Wilson", department: "DevOps", avgDailyInteractions: 234, delta7dPct: -6.7 },
      { name: "Rachel Green", department: "QA Engineering", avgDailyInteractions: 198, delta7dPct: 25.4 },
      { name: "Tom Anderson", department: "Data Science", avgDailyInteractions: 176, delta7dPct: 4.2 }
    ]
  },
  {
    clientId: "metro-finance",
    topAppsDaily: [
      { name: "FinanceGPT", vendor: "FinAI Solutions", avgDailyInteractions: 2340, delta7dPct: 14.2 },
      { name: "Claude", vendor: "Anthropic", avgDailyInteractions: 890, delta7dPct: -7.8 },
      { name: "ChatGPT", vendor: "OpenAI", avgDailyInteractions: 654, delta7dPct: 9.3 },
      { name: "Bloomberg GPT", vendor: "Bloomberg", avgDailyInteractions: 432, delta7dPct: 16.7 },
      { name: "Copilot", vendor: "Microsoft", avgDailyInteractions: 321, delta7dPct: -12.4 }
    ],
    topAgentsDaily: [
      { name: "RiskAnalyzer Pro", vendor: "RiskTech", avgDailyInteractions: 1567, delta7dPct: 11.8 },
      { name: "Portfolio AI", vendor: "InvestTech", avgDailyInteractions: 1234, delta7dPct: 6.5 },
      { name: "Compliance Bot", vendor: "RegTech", avgDailyInteractions: 987, delta7dPct: -4.1 },
      { name: "Trading Assistant", vendor: "TradeTech", avgDailyInteractions: 876, delta7dPct: 20.3 },
      { name: "Credit Analyzer", vendor: "CreditAI", avgDailyInteractions: 654, delta7dPct: 8.9 }
    ],
    topUsersDaily: [
      { name: "Jennifer Davis", department: "Risk Management", avgDailyInteractions: 198, delta7dPct: 15.7 },
      { name: "Robert Brown", department: "Investment Banking", avgDailyInteractions: 176, delta7dPct: 8.2 },
      { name: "Amanda Clark", department: "Compliance", avgDailyInteractions: 165, delta7dPct: -3.9 },
      { name: "Michael Lee", department: "Portfolio Management", avgDailyInteractions: 143, delta7dPct: 12.1 },
      { name: "Sarah Martinez", department: "Credit Analysis", avgDailyInteractions: 129, delta7dPct: 6.8 }
    ]
  }
];

export const getEngagementForClient = (clientId: string): ClientEngagement | null => {
  return engagementData.find(ce => ce.clientId === clientId) || null;
};