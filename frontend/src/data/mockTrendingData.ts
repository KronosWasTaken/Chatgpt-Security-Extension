// Mock trending data for KPI tiles
export interface TrendingData {
  clientId: string;
  appsMonitoredDelta: number; // change in number over 7 days
  interactionsMonitoredDelta: number;
  agentsDeployedDelta: number;
  complianceCoverageDelta: number; // percentage change
}

export const trendingData: TrendingData[] = [
  {
    clientId: "acme-health",
    appsMonitoredDelta: 2,
    interactionsMonitoredDelta: 1250,
    agentsDeployedDelta: 1,
    complianceCoverageDelta: 3.2
  },
  {
    clientId: "techcorp-solutions", 
    appsMonitoredDelta: 3,
    interactionsMonitoredDelta: 2100,
    agentsDeployedDelta: 2,
    complianceCoverageDelta: 1.8
  },
  {
    clientId: "metro-finance",
    appsMonitoredDelta: -1,
    interactionsMonitoredDelta: -890,
    agentsDeployedDelta: 0,
    complianceCoverageDelta: 2.1
  }
];

export const getTrendingDataForClient = (clientId: string): TrendingData | null => {
  return trendingData.find(data => data.clientId === clientId) || null;
};

// Portfolio level trending for dashboard
export const getPortfolioTrending = () => {
  return {
    appsMonitoredDelta: 4, // total change across all clients
    agentsDeployedDelta: 3
  };
};