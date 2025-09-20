export type ClientComplianceReport = {
  clientId: string;
  clientName: string;
  period: string;
  coverage: {
    percentage: number;
    implemented: number;
    total: number;
  };
  evidence: {
    percentage: number;
    complete: number;
    total: number;
  };
  alertSummary: {
    family: string;
    count: number;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
  }[];
  implementedControls: string[];
  openGaps: string[];
  engagementHighlights: {
    topApps: { name: string; change: number }[];
    topAgents: { name: string; change: number }[];
  };
  nextActions: string[];
};

export type PortfolioValueReport = {
  period: string;
  coverageDelta: number;
  totalAlerts: {
    family: string;
    count: number;
  }[];
  topStandardizations: string[];
  estimatedSavings: {
    licenseOptimization: number;
    riskReduction: number;
    complianceEfficiency: number;
  };
  highlights: string[];
  nextActions: string[];
};

export const sampleClientReport: ClientComplianceReport = {
  clientId: 'acme',
  clientName: 'Acme Corporation',
  period: 'Q3 2025',
  coverage: {
    percentage: 87,
    implemented: 52,
    total: 60
  },
  evidence: {
    percentage: 92,
    complete: 55,
    total: 60
  },
  alertSummary: [
    { family: 'Unsanctioned Use', count: 1, severity: 'High' },
    { family: 'Sensitive Data', count: 2, severity: 'High' },
    { family: 'Enforcement', count: 1, severity: 'Low' },
    { family: 'Config Drift', count: 1, severity: 'High' }
  ],
  implementedControls: [
    'AI.GOV-1.1: AI governance structure established',
    'AI.MGT-2.3: AI risk assessment framework deployed',
    'AI.RMF-3.1: Automated monitoring for PII/PHI detection',
    'AI.RMF-4.2: Real-time policy enforcement controls',
    'AI.GOV-5.1: Incident response procedures for AI systems'
  ],
  openGaps: [
    'AI.RMF-2.4: Bias testing framework (Evidence due: Oct 15)',
    'AI.GOV-3.2: Third-party AI vendor assessments (In progress)',
    'AI.MGT-1.5: AI system inventory completeness (85% complete)'
  ],
  engagementHighlights: {
    topApps: [
      { name: 'ChatGPT', change: 15.2 },
      { name: 'M365 Copilot', change: -8.7 },
      { name: 'GitHub Copilot', change: 23.1 }
    ],
    topAgents: [
      { name: 'DataAnalyzer', change: 45.3 },
      { name: 'ReportBot', change: -12.4 }
    ]
  },
  nextActions: [
    'Complete bias testing framework implementation by Oct 15',
    'Review and approve 3 pending vendor assessments',
    'Address PII detection bypass in Finance department configuration',
    'Investigate Perplexity usage spike and determine approval status'
  ]
};

export const samplePortfolioReport: PortfolioValueReport = {
  period: 'Q3 2025',
  coverageDelta: 12.3,
  totalAlerts: [
    { family: 'Unsanctioned Use', count: 3 },
    { family: 'Sensitive Data', count: 5 },
    { family: 'Agent Risk', count: 2 },
    { family: 'Policy Violation', count: 1 },
    { family: 'Usage Anomaly', count: 2 },
    { family: 'Compliance Gap', count: 3 },
    { family: 'Config Drift', count: 2 },
    { family: 'Enforcement', count: 4 }
  ],
  topStandardizations: [
    'NIST AI RMF adoption across 85% of clients',
    'Unified PII/PHI detection policies (3 clients)',
    'Standardized incident response workflows',
    'Common agent deployment guardrails'
  ],
  estimatedSavings: {
    licenseOptimization: 234000,
    riskReduction: 567000,
    complianceEfficiency: 189000
  },
  highlights: [
    'Prevented 23 potential data breaches through automated detection',
    'Reduced compliance prep time by 40% via standardized frameworks',
    'Achieved 95% client satisfaction with AI governance platform',
    'Onboarded 2 new clients with accelerated 30-day deployment'
  ],
  nextActions: [
    'Expand EU AI Act readiness assessments to all clients',
    'Deploy advanced agent risk controls to 3 remaining clients',
    'Conduct quarterly business review presentations',
    'Pilot predictive compliance gap identification system'
  ]
};