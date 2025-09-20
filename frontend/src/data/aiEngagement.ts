export interface DepartmentEngagement {
  department: string;
  interactions: number;
  active_users: number;
  pct_change_vs_prev_7d: number;
}

export interface ApplicationEngagement {
  application: string;
  vendor: string;
  icon: string;
  active_users: number;
  interactions_per_day: number;
  trend_pct_7d: number;
  utilization: "High" | "Medium" | "Low";
  recommendation: string;
}

export interface AgentEngagement {
  agent: string;
  vendor: string;
  icon: string;
  deployed: number;
  avg_prompts_per_day: number;
  flagged_actions: number;
  trend_pct_7d: number;
  status: "Rising" | "Stable" | "Dormant";
  last_activity_iso: string;
  associated_apps: string[];
}

export interface ProductivityCorrelation {
  ai_interactions_7d: number[];
  output_metric_7d: number[];
  note: string;
}

export interface AIEngagementData {
  departments: DepartmentEngagement[];
  applications: ApplicationEngagement[];
  agents: AgentEngagement[];
  productivity_correlations: Record<string, ProductivityCorrelation>;
}

// Sample data as specified
export const aiEngagementData: AIEngagementData = {
  departments: [
    {"department":"Sales","interactions":1820,"active_users":64,"pct_change_vs_prev_7d":12},
    {"department":"Marketing","interactions":1330,"active_users":41,"pct_change_vs_prev_7d":8},
    {"department":"Customer Support","interactions":980,"active_users":28,"pct_change_vs_prev_7d":15},
    {"department":"Engineering","interactions":720,"active_users":22,"pct_change_vs_prev_7d":-5},
    {"department":"Finance","interactions":310,"active_users":11,"pct_change_vs_prev_7d":3},
    {"department":"HR","interactions":140,"active_users":6,"pct_change_vs_prev_7d":-2}
  ],
  applications: [
    {
      "application":"ChatGPT Enterprise",
      "vendor":"OpenAI",
      "icon":"chatgpt",
      "active_users":72,
      "interactions_per_day":210,
      "trend_pct_7d":14,
      "utilization":"High",
      "recommendation":"Maintain momentum in Sales & Support"
    },
    {
      "application":"Claude for Work",
      "vendor":"Anthropic",
      "icon":"claude",
      "active_users":38,
      "interactions_per_day":96,
      "trend_pct_7d":9,
      "utilization":"Medium",
      "recommendation":"Promote to Marketing playbooks"
    },
    {
      "application":"Microsoft Copilot (M365)",
      "vendor":"Microsoft",
      "icon":"copilot",
      "active_users":51,
      "interactions_per_day":115,
      "trend_pct_7d":5,
      "utilization":"High",
      "recommendation":"Roll training to Finance"
    },
    {
      "application":"Jasper",
      "vendor":"Jasper",
      "icon":"jasper",
      "active_users":12,
      "interactions_per_day":24,
      "trend_pct_7d":-7,
      "utilization":"Low",
      "recommendation":"Candidate to cut or consolidate"
    },
    {
      "application":"Notion Q&A",
      "vendor":"Notion",
      "icon":"notion",
      "active_users":17,
      "interactions_per_day":31,
      "trend_pct_7d":3,
      "utilization":"Medium",
      "recommendation":"Coach HR on search prompts"
    },
    {
      "application":"Perplexity Teams",
      "vendor":"Perplexity",
      "icon":"perplexity",
      "active_users":9,
      "interactions_per_day":18,
      "trend_pct_7d":-4,
      "utilization":"Low",
      "recommendation":"Underutilized—consider removing seats"
    }
  ],
  agents: [
    {
      "agent":"Sales Email Coach",
      "vendor":"Internal",
      "icon":"bot",
      "deployed":8,
      "avg_prompts_per_day":62,
      "flagged_actions":1,
      "trend_pct_7d":18,
      "status":"Rising",
      "last_activity_iso":"2025-09-10T13:45:00Z",
      "associated_apps":["ChatGPT Enterprise","Copilot (M365)"]
    },
    {
      "agent":"Support Reply Summarizer",
      "vendor":"Internal",
      "icon":"bot",
      "deployed":5,
      "avg_prompts_per_day":41,
      "flagged_actions":0,
      "trend_pct_7d":11,
      "status":"Rising",
      "last_activity_iso":"2025-09-10T14:02:00Z",
      "associated_apps":["Claude for Work","ChatGPT Enterprise"]
    },
    {
      "agent":"Marketing Brief Generator",
      "vendor":"Internal",
      "icon":"bot",
      "deployed":4,
      "avg_prompts_per_day":12,
      "flagged_actions":2,
      "trend_pct_7d":-6,
      "status":"Stable",
      "last_activity_iso":"2025-09-09T22:18:00Z",
      "associated_apps":["Claude for Work","Jasper"]
    },
    {
      "agent":"Finance Reconciliation Helper",
      "vendor":"Internal",
      "icon":"bot",
      "deployed":3,
      "avg_prompts_per_day":7,
      "flagged_actions":0,
      "trend_pct_7d":-3,
      "status":"Dormant",
      "last_activity_iso":"2025-09-04T16:10:00Z",
      "associated_apps":["Copilot (M365)"]
    }
  ],
  productivity_correlations: {
    "Sales": {
      "ai_interactions_7d":[210,235,260,250,270,295,300],
      "output_metric_7d":[420,445,470,465,490,510,525],
      "note":"Higher AI usage aligns with +12% emails drafted"
    },
    "Customer Support": {
      "ai_interactions_7d":[110,125,140,150,160,180,215],
      "output_metric_7d":[88,92,95,97,101,106,114],
      "note":"Increasing AI use correlates with faster resolutions"
    },
    "Marketing": {
      "ai_interactions_7d":[160,170,175,180,190,200,225],
      "output_metric_7d":[35,38,37,39,41,42,45],
      "note":"Steady lift with creative output"
    }
  }
};

// Utility functions
export const getTotalInteractions = () => {
  return aiEngagementData.departments.reduce((sum, dept) => sum + dept.interactions, 0);
};

export const getTotalActiveUsers = () => {
  return aiEngagementData.departments.reduce((sum, dept) => sum + dept.active_users, 0);
};

export const getMostActiveDepartment = () => {
  return aiEngagementData.departments.reduce((max, dept) => 
    dept.interactions > max.interactions ? dept : max
  );
};

export const getTopApplication = () => {
  return aiEngagementData.applications.reduce((max, app) => 
    app.interactions_per_day > max.interactions_per_day ? app : max
  );
};

export const getUnderutilizedAppsCount = () => {
  return aiEngagementData.applications.filter(app => app.utilization === "Low").length;
};

export const getRecommendations = () => {
  return {
    pushAdoption: [
      "Finance accounts for just 3% of interactions — pilot Copilot (M365) workflows to increase adoption.",
      "HR usage is low and trending flat — run a Notion Q&A training to boost document discovery."
    ],
    cutWaste: [
      "Jasper has 12 active users / 24 interactions/day with a negative trend — consolidate or cut licenses.",
      "Perplexity Teams is below utilization threshold — consider removing seats or targeting a specific team use case."
    ],
    celebrateWins: [
      "Sales is the most active department (+12% vs. last 7d); Sales Email Coach agent adoption is rising.",
      "Customer Support AI usage up 15% — correlates with higher tickets resolved."
    ],
    riskWatch: [
      "Marketing Brief Generator logged 2 flagged actions this week — review prompts and guardrails."
    ]
  };
};