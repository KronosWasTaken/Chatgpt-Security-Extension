export interface Client {
  id: string;
  name: string;
  industry: string;
  company_size: string;
  status: string;
  subscription_tier: string;
  apps_monitored: number;
  interactions_monitored: number;
  agents_deployed: number;
  risk_score: number; // 0-100
  compliance_coverage: number; // 0-100 percentage
  created_at: string;
  updated_at: string;
}

export const clients: Client[] = [
  {
    id: "acme-health",
    name: "Acme Health",
    industry: "Healthcare",
    company_size: "medium",
    status: "active",
    subscription_tier: "Professional",
    apps_monitored: 18,
    interactions_monitored: 12450,
    agents_deployed: 7,
    risk_score: 75,
    compliance_coverage: 87,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-20T15:30:00Z"
  },
  {
    id: "techcorp-solutions",
    name: "TechCorp Solutions",
    industry: "Technology",
    company_size: "large",
    status: "active",
    subscription_tier: "Enterprise",
    apps_monitored: 24,
    interactions_monitored: 28900,
    agents_deployed: 12,
    risk_score: 45,
    compliance_coverage: 93,
    created_at: "2024-01-10T09:00:00Z",
    updated_at: "2024-01-22T11:15:00Z"
  },
  {
    id: "metro-finance",
    name: "Metro Finance",
    industry: "Financial Services",
    company_size: "large",
    status: "active",
    subscription_tier: "Enterprise",
    apps_monitored: 31,
    interactions_monitored: 15670,
    agents_deployed: 9,
    risk_score: 85,
    compliance_coverage: 91,
    created_at: "2024-01-05T14:00:00Z",
    updated_at: "2024-01-21T16:45:00Z"
  }
];

// MSP Portfolio Totals
export const getPortfolioTotals = () => {
  const totals = clients.reduce(
    (acc, client) => ({
      apps_monitored: acc.apps_monitored + client.apps_monitored,
      interactions_monitored: acc.interactions_monitored + client.interactions_monitored,
      agents_deployed: acc.agents_deployed + client.agents_deployed,
      avg_risk_score: acc.avg_risk_score + client.risk_score,
    }),
    { apps_monitored: 0, interactions_monitored: 0, agents_deployed: 0, avg_risk_score: 0 }
  );

  return {
    ...totals,
    avg_risk_score: Math.round(totals.avg_risk_score / clients.length)
  };
};