export interface Framework {
  id: string;
  name: string;
  coveragePct: number;
  evidencePct: number;
  lastUpdated: string;
  description: string;
}

export interface ClientFrameworks {
  clientId: string;
  frameworks: Framework[];
}

export const frameworksData: ClientFrameworks[] = [
  {
    clientId: "acme-health",
    frameworks: [
      {
        id: "nist",
        name: "NIST AI Risk Management Framework",
        coveragePct: 85,
        evidencePct: 72,
        lastUpdated: "2024-01-08",
        description: "Comprehensive AI risk management and governance framework"
      },
      {
        id: "eu-ai",
        name: "EU AI Act",
        coveragePct: 78,
        evidencePct: 65,
        lastUpdated: "2024-01-05",
        description: "European Union AI regulation compliance requirements"
      },
      {
        id: "iso-42001",
        name: "ISO/IEC 42001",
        coveragePct: 92,
        evidencePct: 88,
        lastUpdated: "2024-01-10",
        description: "AI management systems international standard"
      },
      {
        id: "co-sb21-169",
        name: "Colorado SB21-169",
        coveragePct: 90,
        evidencePct: 85,
        lastUpdated: "2024-01-07",
        description: "Colorado privacy and AI bias detection requirements"
      },
      {
        id: "nyc-144",
        name: "NYC Local Law 144",
        coveragePct: 88,
        evidencePct: 90,
        lastUpdated: "2024-01-09",
        description: "New York City automated employment decision tools law"
      }
    ]
  },
  {
    clientId: "techcorp-solutions",
    frameworks: [
      {
        id: "nist",
        name: "NIST AI Risk Management Framework",
        coveragePct: 95,
        evidencePct: 91,
        lastUpdated: "2024-01-09",
        description: "Comprehensive AI risk management and governance framework"
      },
      {
        id: "eu-ai",
        name: "EU AI Act",
        coveragePct: 88,
        evidencePct: 82,
        lastUpdated: "2024-01-08",
        description: "European Union AI regulation compliance requirements"
      },
      {
        id: "iso-42001",
        name: "ISO/IEC 42001",
        coveragePct: 97,
        evidencePct: 94,
        lastUpdated: "2024-01-10",
        description: "AI management systems international standard"
      }
    ]
  },
  {
    clientId: "metro-finance",
    frameworks: [
      {
        id: "nist",
        name: "NIST AI Risk Management Framework",
        coveragePct: 92,
        evidencePct: 88,
        lastUpdated: "2024-01-08",
        description: "Comprehensive AI risk management and governance framework"
      },
      {
        id: "eu-ai",
        name: "EU AI Act",
        coveragePct: 85,
        evidencePct: 79,
        lastUpdated: "2024-01-06",
        description: "European Union AI regulation compliance requirements"
      },
      {
        id: "iso-42001",
        name: "ISO/IEC 42001",
        coveragePct: 94,
        evidencePct: 92,
        lastUpdated: "2024-01-09",
        description: "AI management systems international standard"
      },
      {
        id: "co-sb21-169",
        name: "Colorado SB21-169",
        coveragePct: 96,
        evidencePct: 94,
        lastUpdated: "2024-01-10",
        description: "Colorado privacy and AI bias detection requirements"
      }
    ]
  }
];

export const getFrameworksForClient = (clientId: string): Framework[] => {
  const clientFrameworks = frameworksData.find(cf => cf.clientId === clientId);
  return clientFrameworks?.frameworks || [];
};