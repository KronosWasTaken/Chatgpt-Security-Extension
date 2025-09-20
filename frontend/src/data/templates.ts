export type PolicyTemplate = {
  id: string;
  name: string;
  description: string;
  industry: string;
  rules: PolicyRule[];
  yaml: string;
};

export type PolicyRule = {
  id: string;
  category: 'PII' | 'PHI' | 'Secrets' | 'SourceCode' | 'CustomerData';
  enabled: boolean;
  effect: 'Allow' | 'Redact' | 'Block';
  description: string;
};

export const policyTemplates: PolicyTemplate[] = [
  {
    id: 'financial',
    name: 'Financial Services',
    description: 'Comprehensive data protection for banking, investment, and financial institutions with SOX compliance',
    industry: 'Financial',
    rules: [
      { id: 'pii-fin', category: 'PII', enabled: true, effect: 'Block', description: 'SSN, driver license, passport numbers' },
      { id: 'phi-fin', category: 'PHI', enabled: false, effect: 'Allow', description: 'Medical information (not applicable)' },
      { id: 'secrets-fin', category: 'Secrets', enabled: true, effect: 'Block', description: 'API keys, certificates, credentials' },
      { id: 'source-fin', category: 'SourceCode', enabled: true, effect: 'Redact', description: 'Proprietary algorithms, trading code' },
      { id: 'customer-fin', category: 'CustomerData', enabled: true, effect: 'Block', description: 'Account numbers, transaction data, credit info' }
    ],
    yaml: `# Financial Services AI Policy
name: "Financial Services Policy"
version: "1.0"
controls:
  pii:
    enabled: true
    action: block
    patterns:
      - ssn
      - drivers_license
      - passport
  secrets:
    enabled: true 
    action: block
    patterns:
      - api_key
      - certificate
      - password
  customer_data:
    enabled: true
    action: block
    patterns:
      - account_number
      - routing_number
      - credit_card`
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Life Sciences',
    description: 'HIPAA-compliant policies for protecting patient data and medical information in AI interactions',
    industry: 'Healthcare',
    rules: [
      { id: 'pii-health', category: 'PII', enabled: true, effect: 'Block', description: 'Patient identifiers, SSN, addresses' },
      { id: 'phi-health', category: 'PHI', enabled: true, effect: 'Block', description: 'Protected health information, medical records' },
      { id: 'secrets-health', category: 'Secrets', enabled: true, effect: 'Block', description: 'System credentials, API tokens' },
      { id: 'source-health', category: 'SourceCode', enabled: true, effect: 'Redact', description: 'Proprietary medical algorithms' },
      { id: 'customer-health', category: 'CustomerData', enabled: true, effect: 'Block', description: 'Patient records, treatment data' }
    ],
    yaml: `# Healthcare AI Policy
name: "Healthcare HIPAA Policy" 
version: "1.0"
controls:
  phi:
    enabled: true
    action: block
    patterns:
      - medical_record_number
      - diagnosis_code
      - treatment_plan
  pii:
    enabled: true
    action: block
    patterns:
      - patient_name
      - date_of_birth
      - ssn`
  },
  {
    id: 'insurance',
    name: 'Insurance',
    description: 'Risk management and claim data protection for insurance carriers and brokers',
    industry: 'Insurance',
    rules: [
      { id: 'pii-ins', category: 'PII', enabled: true, effect: 'Redact', description: 'Policyholder personal information' },
      { id: 'phi-ins', category: 'PHI', enabled: true, effect: 'Block', description: 'Medical information in claims' },
      { id: 'secrets-ins', category: 'Secrets', enabled: true, effect: 'Block', description: 'System access credentials' },
      { id: 'source-ins', category: 'SourceCode', enabled: true, effect: 'Redact', description: 'Risk assessment algorithms' },
      { id: 'customer-ins', category: 'CustomerData', enabled: true, effect: 'Redact', description: 'Policy details, claim information' }
    ],
    yaml: `# Insurance AI Policy
name: "Insurance Data Policy"
version: "1.0"  
controls:
  pii:
    enabled: true
    action: redact
    patterns:
      - policy_number
      - claim_number
      - driver_license
  customer_data:
    enabled: true
    action: redact
    patterns:
      - premium_amount
      - coverage_details`
  },
  {
    id: 'retail',
    name: 'Retail & E-commerce',
    description: 'Customer data protection and competitive intelligence safeguards for retail operations',
    industry: 'Retail',
    rules: [
      { id: 'pii-retail', category: 'PII', enabled: true, effect: 'Redact', description: 'Customer contact information' },
      { id: 'phi-retail', category: 'PHI', enabled: false, effect: 'Allow', description: 'Medical data (not applicable)' },
      { id: 'secrets-retail', category: 'Secrets', enabled: true, effect: 'Block', description: 'Payment processing credentials' },
      { id: 'source-retail', category: 'SourceCode', enabled: true, effect: 'Redact', description: 'Recommendation algorithms, pricing logic' },
      { id: 'customer-retail', category: 'CustomerData', enabled: true, effect: 'Redact', description: 'Purchase history, payment methods' }
    ],
    yaml: `# Retail AI Policy
name: "Retail Customer Policy"
version: "1.0"
controls:
  pii:
    enabled: true
    action: redact
    patterns:
      - email_address
      - phone_number
      - shipping_address
  customer_data:
    enabled: true
    action: redact
    patterns:
      - order_history
      - payment_method`
  }
];