export type RiskLevel = 'Low' | 'Medium' | 'High';

export const getRiskLevel = (score: number): RiskLevel => {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
};

export const getRiskBadgeClass = (level: RiskLevel): string => {
  switch (level) {
    case 'High':
      return 'bg-risk-high text-white';
    case 'Medium':
      return 'bg-risk-medium text-white';
    case 'Low':
      return 'bg-risk-low text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) {
    return '0';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const formatPercentage = (num: number): string => {
  return `${num}%`;
};

export const formatDelta = (delta: number): { text: string; className: string } => {
  const isPositive = delta > 0;
  const sign = isPositive ? '+' : '';
  return {
    text: `${sign}${delta.toFixed(1)}%`,
    className: isPositive ? 'text-cybercept-teal' : 'text-risk-high'
  };
};

export const getStatusPillClass = (status: 'Permitted' | 'Unsanctioned'): string => {
  switch (status) {
    case 'Permitted':
      return 'bg-cybercept-teal/10 text-cybercept-teal border-cybercept-teal/20';
    case 'Unsanctioned':
      return 'bg-muted text-subtext border-border relative';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const generateSparklineData = (baseValue: number, trend: number): number[] => {
  const data = [];
  for (let i = 0; i < 7; i++) {
    const variation = (Math.random() - 0.5) * 0.2; // ±10% random variation
    const trendAdjustment = (trend / 100) * (i / 6); // Apply trend over time
    data.push(Math.max(0, baseValue * (1 + variation + trendAdjustment)));
  }
  return data;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export const getIntegrationColor = (integration: string): string => {
  const colors = {
    'Salesforce': 'bg-blue-100 text-blue-800',
    'Outlook': 'bg-indigo-100 text-indigo-800',
    'Gmail': 'bg-red-100 text-red-800',
    'QuickBooks': 'bg-green-100 text-green-800',
    'SharePoint': 'bg-purple-100 text-purple-800',
    'Epic': 'bg-orange-100 text-orange-800',
    'GitHub': 'bg-gray-100 text-gray-800',
    'Slack': 'bg-pink-100 text-pink-800',
    'Jira': 'bg-cyan-100 text-cyan-800',
    'Bloomberg': 'bg-yellow-100 text-yellow-800',
    'VS Code': 'bg-blue-100 text-blue-800'
  };
  return colors[integration as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};