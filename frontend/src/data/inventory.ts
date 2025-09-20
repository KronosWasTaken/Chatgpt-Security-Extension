export interface InventoryItem {
  id: string;
  type: 'Application' | 'Agent';
  name: string;
  vendor: string;
  users: number;
  avgDailyInteractions: number;
  status: 'Permitted' | 'Unsanctioned';
  integrations: string[];
}

export interface ClientInventory {
  clientId: string;
  items: InventoryItem[];
}

export const inventoryData: ClientInventory[] = [
  {
    clientId: "acme-health",
    items: [
      {
        id: "chatgpt-app",
        type: "Application",
        name: "ChatGPT",
        vendor: "OpenAI",
        users: 145,
        avgDailyInteractions: 2890,
        status: "Permitted",
        integrations: ["Salesforce", "Outlook"]
      },
      {
        id: "copilot-app",
        type: "Application", 
        name: "Microsoft Copilot",
        vendor: "Microsoft",
        users: 98,
        avgDailyInteractions: 1567,
        status: "Permitted",
        integrations: ["Outlook", "SharePoint"]
      },
      {
        id: "claude-app",
        type: "Application",
        name: "Claude",
        vendor: "Anthropic",
        users: 23,
        avgDailyInteractions: 456,
        status: "Unsanctioned",
        integrations: []
      },
      {
        id: "medical-ai-agent",
        type: "Agent",
        name: "MedAssist AI",
        vendor: "HealthTech Inc",
        users: 67,
        avgDailyInteractions: 1234,
        status: "Permitted",
        integrations: ["Epic", "Salesforce"]
      },
      {
        id: "scheduling-agent",
        type: "Agent",
        name: "SmartScheduler",
        vendor: "AI Solutions",
        users: 189,
        avgDailyInteractions: 3456,
        status: "Permitted",
        integrations: ["Outlook", "Gmail"]
      },
      {
        id: "billing-agent",
        type: "Agent",
        name: "BillBot Pro",
        vendor: "FinanceAI",
        users: 34,
        avgDailyInteractions: 890,
        status: "Permitted",
        integrations: ["QuickBooks", "Salesforce"]
      }
    ]
  },
  {
    clientId: "techcorp-solutions",
    items: [
      {
        id: "github-copilot",
        type: "Application",
        name: "GitHub Copilot",
        vendor: "GitHub",
        users: 234,
        avgDailyInteractions: 5670,
        status: "Permitted",
        integrations: ["GitHub", "VS Code"]
      },
      {
        id: "chatgpt-tech",
        type: "Application",
        name: "ChatGPT Plus",
        vendor: "OpenAI",
        users: 156,
        avgDailyInteractions: 3210,
        status: "Permitted",
        integrations: ["Slack", "Jira"]
      },
      {
        id: "code-review-agent",
        type: "Agent",
        name: "CodeReviewer AI",
        vendor: "DevAI Corp",
        users: 89,
        avgDailyInteractions: 1890,
        status: "Permitted",
        integrations: ["GitHub", "Jira"]
      },
      {
        id: "gemini-app",
        type: "Application",
        name: "Google Gemini",
        vendor: "Google",
        users: 67,
        avgDailyInteractions: 1234,
        status: "Unsanctioned",
        integrations: []
      }
    ]
  },
  {
    clientId: "metro-finance",
    items: [
      {
        id: "financial-ai",
        type: "Application",
        name: "FinanceGPT",
        vendor: "FinAI Solutions",
        users: 123,
        avgDailyInteractions: 2340,
        status: "Permitted",
        integrations: ["QuickBooks", "Salesforce"]
      },
      {
        id: "risk-agent",
        type: "Agent",
        name: "RiskAnalyzer Pro",
        vendor: "RiskTech",
        users: 45,
        avgDailyInteractions: 1567,
        status: "Permitted",
        integrations: ["Bloomberg", "QuickBooks"]
      },
      {
        id: "claude-finance",
        type: "Application",
        name: "Claude",
        vendor: "Anthropic",
        users: 78,
        avgDailyInteractions: 890,
        status: "Unsanctioned",
        integrations: []
      }
    ]
  }
];

export const getInventoryForClient = (clientId: string): InventoryItem[] => {
  const clientInventory = inventoryData.find(ci => ci.clientId === clientId);
  return clientInventory?.items || [];
};