import { PolicyRule } from './templates';

export type ClientPolicy = {
  id: string;
  clientId: string;
  name: string;
  rules: PolicyRule[];
  yaml: string;
  lastModified: string;
  isActive: boolean;
};

export const clientPolicies: ClientPolicy[] = [
  {
    id: 'acme-default',
    clientId: 'acme',
    name: 'Default Public AI Policy',
    lastModified: '2025-09-05T10:30:00Z',
    isActive: true,
    rules: [
      { id: 'pii-acme', category: 'PII', enabled: true, effect: 'Block', description: 'Personal identifiers, SSN, addresses' },
      { id: 'phi-acme', category: 'PHI', enabled: false, effect: 'Allow', description: 'Medical information (not applicable)' },
      { id: 'secrets-acme', category: 'Secrets', enabled: true, effect: 'Block', description: 'API keys, passwords, certificates' },
      { id: 'source-acme', category: 'SourceCode', enabled: true, effect: 'Redact', description: 'Proprietary code and algorithms' },
      { id: 'customer-acme', category: 'CustomerData', enabled: true, effect: 'Redact', description: 'Customer records and business data' }
    ],
    yaml: `# Acme Corp AI Policy
name: "Acme Default Public AI Policy"
version: "2.1"
effective_date: "2025-09-05"
controls:
  pii:
    enabled: true
    action: block
    patterns:
      - ssn
      - email_address
      - phone_number
      - home_address
  secrets:
    enabled: true
    action: block
    patterns:
      - api_key
      - password
      - private_key
      - access_token
  source_code:
    enabled: true
    action: redact
    patterns:
      - function_signature
      - database_schema
      - algorithm_implementation
  customer_data:
    enabled: true
    action: redact
    patterns:
      - customer_id
      - order_number
      - contract_terms`
  },
  {
    id: 'northstar-medical',
    clientId: 'northstar',
    name: 'Healthcare HIPAA Policy',
    lastModified: '2025-09-03T14:15:00Z',
    isActive: true,
    rules: [
      { id: 'pii-north', category: 'PII', enabled: true, effect: 'Block', description: 'Patient identifiers and personal data' },
      { id: 'phi-north', category: 'PHI', enabled: true, effect: 'Block', description: 'Protected health information' },
      { id: 'secrets-north', category: 'Secrets', enabled: true, effect: 'Block', description: 'System credentials and access tokens' },
      { id: 'source-north', category: 'SourceCode', enabled: true, effect: 'Block', description: 'Medical software and algorithms' },
      { id: 'customer-north', category: 'CustomerData', enabled: true, effect: 'Block', description: 'Patient records and medical data' }
    ],
    yaml: `# NorthStar Medical HIPAA Policy
name: "NorthStar HIPAA Compliance Policy"
version: "1.3"
effective_date: "2025-09-03"
controls:
  phi:
    enabled: true
    action: block
    patterns:
      - medical_record_number
      - diagnosis_code
      - prescription_data
      - lab_results
  pii:
    enabled: true
    action: block
    patterns:
      - patient_name
      - date_of_birth
      - ssn
      - insurance_id`
  },
  {
    id: 'orbit-financial',
    clientId: 'orbit',
    name: 'Financial Services SOX Policy',
    lastModified: '2025-09-01T09:45:00Z',
    isActive: true,
    rules: [
      { id: 'pii-orbit', category: 'PII', enabled: true, effect: 'Block', description: 'Customer personal information' },
      { id: 'phi-orbit', category: 'PHI', enabled: false, effect: 'Allow', description: 'Medical data (not applicable)' },
      { id: 'secrets-orbit', category: 'Secrets', enabled: true, effect: 'Block', description: 'Trading system credentials' },
      { id: 'source-orbit', category: 'SourceCode', enabled: true, effect: 'Block', description: 'Trading algorithms and financial models' },
      { id: 'customer-orbit', category: 'CustomerData', enabled: true, effect: 'Block', description: 'Account data and transaction records' }
    ],
    yaml: `# Orbit Financial SOX Policy
name: "Orbit Financial SOX Compliance Policy"
version: "1.0"
effective_date: "2025-09-01"
controls:
  financial_data:
    enabled: true
    action: block
    patterns:
      - account_number
      - routing_number
      - transaction_id
      - credit_score
  trading_data:
    enabled: true
    action: block
    patterns:
      - portfolio_value
      - trading_strategy
      - risk_model`
  }
];