import { apiClient } from "@/services/api";

// Fallback data structure for when API is not available
const fallbackData: AIEngagementData = {
  departments: [],
  applications: [],
  agents: [],
  productivity_correlations: {}
};

// Global state for AI engagement data
let cachedData: AIEngagementData | null = null;
let isInitialized = false;

// Event listeners for data updates
type DataUpdateListener = () => void;
const dataUpdateListeners: DataUpdateListener[] = [];

// Function to notify all listeners that data has been updated
const notifyDataUpdate = () => {
  dataUpdateListeners.forEach(listener => {
    try {
      listener();
    } catch (error) {
      console.error('Error in data update listener:', error);
    }
  });
};

// Helper function to ensure data structure integrity
const ensureDataStructure = (data: any): AIEngagementData => {
  // If data is wrapped in a 'data' property, unwrap it
  const unwrapped = data?.data || data;
  
  return {
    departments: Array.isArray(unwrapped?.departments) ? unwrapped.departments : [],
    applications: Array.isArray(unwrapped?.applications) ? unwrapped.applications : [],
    agents: Array.isArray(unwrapped?.agents) ? unwrapped.agents : [],
    productivity_correlations: unwrapped?.productivity_correlations || {}
  };
};

// Function to fetch AI engagement data from API
export const fetchAIEngagementData = async (
  days?: number,
  clientId?: string
): Promise<AIEngagementData> => {
  try {
    // Try MSP-wide endpoint first (works for MSP roles)
    const data = await apiClient.GetAIEngagement(days);
    cachedData = ensureDataStructure(data);
    isInitialized = true;
    notifyDataUpdate(); // Notify all components that data is ready
    return cachedData;
  } catch (error) {
    // If MSP endpoint fails (e.g., client users with 403), try client-scoped endpoint
    if (clientId) {
      try {
        const clientData = await apiClient.getClientAIEngagement(clientId, days);
        cachedData = ensureDataStructure(clientData);
        isInitialized = true;
        notifyDataUpdate();
        return cachedData;
      } catch (innerError) {
        console.error('Failed to fetch client AI engagement data:', innerError);
      }
    }
    
    console.error('Failed to fetch AI engagement data:', error);
    // Use fallback data if API fails
    cachedData = fallbackData;
    isInitialized = true;
    notifyDataUpdate(); // Notify even with fallback data
    return cachedData;
  }
};

// Function to get cached data (for synchronous access)
export const getCachedAIEngagementData = (): AIEngagementData | null => {
  return cachedData;
};

// Function to initialize data (call this in your app startup)
export const initializeAIEngagementData = async (
  days?: number,
  clientId?: string
): Promise<void> => {
  try {
    await fetchAIEngagementData(days, clientId);
  } catch (error) {
    console.error('Failed to initialize AI engagement data:', error);
  }
};

// Check if data is initialized
export const isDataInitialized = (): boolean => {
  return isInitialized;
};

// Function to subscribe to data updates
export const subscribeToDataUpdates = (listener: DataUpdateListener): (() => void) => {
  dataUpdateListeners.push(listener);
  
  // Return unsubscribe function
  return () => {
    const index = dataUpdateListeners.indexOf(listener);
    if (index > -1) {
      dataUpdateListeners.splice(index, 1);
    }
  };
};

// Auto-initialize data on first access
let autoInitPromise: Promise<void> | null = null;

const autoInitialize = async (): Promise<void> => {
  if (!autoInitPromise) {
    autoInitPromise = initializeAIEngagementData();
  }
  return autoInitPromise;
};

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

// Backward compatibility: Export a getter for aiEngagementData
export const getAIEngagementData = (): AIEngagementData => {
  if (!isInitialized) {
    console.warn('AI Engagement data not initialized. Using fallback data. Auto-initializing in background...');
    // Trigger auto-initialization in background
    autoInitialize().catch(console.error);
    return fallbackData;
  }
  return cachedData || fallbackData;
};

export const aiEngagementData = new Proxy({} as AIEngagementData, {
  get(target, prop) {
    const data = getAIEngagementData();
    if (!data) return fallbackData[prop as keyof AIEngagementData];
    return data[prop as keyof AIEngagementData];
  }
});

export const getTotalInteractions = (data?: AIEngagementData) => {
  const dataToUse = data || getAIEngagementData();
  if (!dataToUse || !dataToUse.departments || !Array.isArray(dataToUse.departments)) {
    return 0;
  }
  return dataToUse.departments.reduce((sum, dept) => sum + dept.interactions, 0);
};

export const getTotalActiveUsers = (data?: AIEngagementData) => {
  const dataToUse = data || getAIEngagementData();
  if (!dataToUse || !dataToUse.departments || !Array.isArray(dataToUse.departments)) {
    return 0;
  }
  return dataToUse.departments.reduce((sum, dept) => sum + dept.active_users, 0);
};

export const getMostActiveDepartment = (data?: AIEngagementData) => {
  const dataToUse = data || getAIEngagementData();
  if (!dataToUse || !dataToUse.departments || !Array.isArray(dataToUse.departments) || dataToUse.departments.length === 0) {
    return { department: "No Data", interactions: 0, active_users: 0, pct_change_vs_prev_7d: 0 };
  }
  return dataToUse.departments.reduce((max, dept) => 
    dept.interactions > max.interactions ? dept : max
  );
};

export const getTopApplication = (data?: AIEngagementData) => {
  const dataToUse = data || getAIEngagementData();
  if (!dataToUse || !dataToUse.applications || !Array.isArray(dataToUse.applications) || dataToUse.applications.length === 0) {
    return { 
      application: "No Data", 
      vendor: "", 
      icon: "", 
      active_users: 0, 
      interactions_per_day: 0, 
      trend_pct_7d: 0, 
      utilization: "Low" as const, 
      recommendation: "No data available" 
    };
  }
  return dataToUse.applications.reduce((max, app) => 
    app.interactions_per_day > max.interactions_per_day ? app : max
  );
};

export const getUnderutilizedAppsCount = (data?: AIEngagementData) => {
  const dataToUse = data || getAIEngagementData();
  if (!dataToUse || !dataToUse.applications || !Array.isArray(dataToUse.applications)) {
    return 0;
  }
  return dataToUse.applications.filter(app => app.utilization === "Low").length;
};

export const getRecommendations = (data?: AIEngagementData) => {
  const dataToUse = data || getAIEngagementData();
  
  // Return default recommendations if no data
  if (!dataToUse || 
      !dataToUse.departments || !Array.isArray(dataToUse.departments) || 
      !dataToUse.applications || !Array.isArray(dataToUse.applications) ||
      dataToUse.departments.length === 0 || 
      dataToUse.applications.length === 0) {
    return {
      pushAdoption: [
        "No data available for adoption recommendations",
        "Initialize AI engagement data to see recommendations"
      ],
      cutWaste: [
        "No data available for waste reduction recommendations",
        "Initialize AI engagement data to see recommendations"
      ],
      celebrateWins: [
        "No data available for success celebrations",
        "Initialize AI engagement data to see recommendations"
      ],
      riskWatch: [
        "No data available for risk monitoring",
        "Initialize AI engagement data to see recommendations"
      ]
    };
  }
  
  const financeDept = dataToUse.departments.find(d => d.department === "Finance");
  const hrDept = dataToUse.departments.find(d => d.department === "HR");
  const salesDept = dataToUse.departments.find(d => d.department === "Sales");
  const supportDept = dataToUse.departments.find(d => d.department === "Customer Support");
  
  const jasperApp = dataToUse.applications.find(app => app.application === "Jasper");
  const perplexityApp = dataToUse.applications.find(app => app.application === "Perplexity Teams");
  const marketingAgent = Array.isArray(dataToUse.agents) 
    ? dataToUse.agents.find(agent => agent.agent === "Marketing Brief Generator")
    : undefined;
  
  return {
    pushAdoption: [
      financeDept ? `Finance accounts for just ${Math.round((financeDept.interactions / getTotalInteractions(dataToUse)) * 100)}% of interactions — pilot Copilot (M365) workflows to increase adoption.` : "Finance usage is low — pilot Copilot (M365) workflows to increase adoption.",
      hrDept ? `HR usage is low and trending ${hrDept.pct_change_vs_prev_7d > 0 ? 'up' : 'flat'} — run a Notion Q&A training to boost document discovery.` : "HR usage is low — run a Notion Q&A training to boost document discovery."
    ],
    cutWaste: [
      jasperApp ? `${jasperApp.application} has ${jasperApp.active_users} active users / ${jasperApp.interactions_per_day} interactions/day with a ${jasperApp.trend_pct_7d > 0 ? 'positive' : 'negative'} trend — consolidate or cut licenses.` : "Some applications show low utilization — consider consolidating licenses.",
      perplexityApp ? `${perplexityApp.application} is below utilization threshold — consider removing seats or targeting a specific team use case.` : "Some applications are underutilized — consider removing seats."
    ],
    celebrateWins: [
      salesDept ? `Sales is the most active department (+${salesDept.pct_change_vs_prev_7d}% vs. last 7d); Sales Email Coach agent adoption is rising.` : "Sales department shows strong AI adoption.",
      supportDept ? `Customer Support AI usage up ${supportDept.pct_change_vs_prev_7d}% — correlates with higher tickets resolved.` : "Customer Support shows improved AI usage."
    ],
    riskWatch: [
      marketingAgent ? `${marketingAgent.agent} logged ${marketingAgent.flagged_actions} flagged actions this week — review prompts and guardrails.` : "Review flagged actions across all agents."
    ]
  };
};