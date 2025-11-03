// data/alerts.ts
// Clients assumed in clients.ts: acme → "Acme Health", techcorp → "TechCorp Solutions", metro → "Metro Finance"

export type FrameworkTag = 'NIST'|'EU_AI'|'ISO_42001'|'CO_SB21_169'|'NYC_144';

export type AlertFamily =
  | 'UNSANCTIONED_USE'
  | 'SENSITIVE_DATA'
  | 'AGENT_RISK'
  | 'POLICY_VIOLATION'
  | 'USAGE_ANOMALY'
  | 'COMPLIANCE_GAP'
  | 'CONFIG_DRIFT'
  | 'ENFORCEMENT';

export type Severity = 'Low'|'Medium'|'High'|'Critical';

export type Subtype =
  | 'PII'|'PHI'|'PCI'|'Secrets'|'SourceCode'|'Financial'|'Confidential'
  | 'Jailbreak'|'PromptInjection'|'Toxic'|'Copyright'|'Bias'|'RegulatedClaim'
  | 'Spike'|'OffHours'|'GeoAnomaly'|'NewDept'
  | 'NotImplemented'|'EvidenceOverdue'|'Regression'
  | 'GuardrailDisabled'|'RetentionReduced'|'NewIntegration'|'ScopeWidened'
  | 'Blocked'|'Redacted'|'Warned'|'Quarantined'
  | 'NewApp'|'NewAgent'|'UsageWithoutApproval'
  | 'PrivilegedAction'|'SODViolation';

export type Alert = {
  id: string;
  ts: string;                 // ISO timestamp
  clientId: 'acme-health'|'techcorp-solutions'|'metro-finance';
  app?: string;               // e.g., 'ChatGPT', 'M365 Copilot'
  assetKind: 'Application'|'Agent';
  family: AlertFamily;
  subtype?: Subtype;
  severity: Severity;
  usersAffected?: number;
  count?: number;             // interactions involved
  details: string;            // keep secrets masked
  frameworks: FrameworkTag[];
  status: 'Unassigned'|'Pending'|'Complete'|'AI Resolved';
};

// 50 realistic alerts spanning ~last 30 days (2025-08-12 .. 2025-09-10)
export const alerts: Alert[] = [

  { id:'a-001', ts:'2025-09-09T14:12:00Z', clientId:'acme-health', app:'Perplexity', assetKind:'Application',
    family:'UNSANCTIONED_USE', subtype:'NewApp', severity:'High',
    details:'First seen across 42 users (↑24% 7d). Not on allowlist.',
    frameworks:['NIST','EU_AI'], status:'Unassigned' },
  { id:'a-002', ts:'2025-09-09T10:41:00Z', clientId:'acme-health', app:'ChatGPT', assetKind:'Application',
    family:'SENSITIVE_DATA', subtype:'Secrets', severity:'High',
    details:'API token sk_live_•••3a9 detected; redacted.',
    frameworks:['NIST','ISO_42001'], status:'Unassigned', count:3 },
  { id:'a-003', ts:'2025-09-09T08:05:00Z', clientId:'metro-finance', app:'SmartScheduler', assetKind:'Agent',
    family:'AGENT_RISK', subtype:'PrivilegedAction', severity:'High',
    details:'Agent attempted "reset admin password" outside scope.',
    frameworks:['NIST','EU_AI'], status:'Unassigned' },
  { id:'a-004', ts:'2025-09-08T22:30:00Z', clientId:'techcorp-solutions', app:'M365 Copilot', assetKind:'Application',
    family:'USAGE_ANOMALY', subtype:'OffHours', severity:'Medium',
    details:'5× spike 01:00–03:00 UTC by 17 users.',
    frameworks:['NIST'], status:'Pending' },
  { id:'a-005', ts:'2025-09-08T16:12:00Z', clientId:'acme-health', app:'ChatGPT', assetKind:'Application',
    family:'ENFORCEMENT', subtype:'Redacted', severity:'Low',
    details:'Secrets redacted in 23 sessions (24h).',
    frameworks:['NIST','ISO_42001'], status:'Unassigned', count:23 },

  // --- 45 additional situations across acme-health / techcorp-solutions / metro-finance ---
  { id:'a-006', ts:'2025-09-08T12:05:00Z', clientId:'acme-health', app:'ChatGPT', assetKind:'Application',
    family:'POLICY_VIOLATION', subtype:'Jailbreak', severity:'Medium',
    details:'Prompt attempted context override; pattern neutralized.',
    frameworks:['NIST','EU_AI'], status:'Pending' },
  { id:'a-007', ts:'2025-09-08T09:18:00Z', clientId:'acme-health', app:'MedAssist AI', assetKind:'Agent',
    family:'SENSITIVE_DATA', subtype:'PHI', severity:'High',
    details:'Patient MRN ****829 in prompt; redaction applied.',
    frameworks:['NIST','ISO_42001'], status:'Unassigned', count:2 },
  { id:'a-008', ts:'2025-09-07T21:44:00Z', clientId:'metro-finance', app:'HubSpot AI', assetKind:'Application',
    family:'USAGE_ANOMALY', subtype:'Spike', severity:'Medium',
    details:'3.2× interactions vs baseline (campaign launch).',
    frameworks:['NIST'], status:'Pending' },
  { id:'a-009', ts:'2025-09-07T18:26:00Z', clientId:'techcorp-solutions', app:'Stripe Radar', assetKind:'Application',
    family:'SENSITIVE_DATA', subtype:'PCI', severity:'High',
    details:'PAN-like pattern **** **** **** 1324 observed; masked.',
    frameworks:['NIST','ISO_42001'], status:'Complete', count:1 },
  { id:'a-010', ts:'2025-09-07T10:11:00Z', clientId:'techcorp-solutions', app:'SmartScheduler', assetKind:'Agent',
    family:'AGENT_RISK', subtype:'SODViolation', severity:'High',
    details:'Agent tried to approve and audit same request (SoD breach).',
    frameworks:['NIST','EU_AI'], status:'Unassigned' },
  { id:'a-011', ts:'2025-09-06T23:55:00Z', clientId:'acme-health', app:'GitHub Copilot', assetKind:'Application',
    family:'SENSITIVE_DATA', subtype:'SourceCode', severity:'Medium',
    details:'Repository secret pattern found in generated snippet; blocked.',
    frameworks:['NIST','ISO_42001'], status:'AI Resolved' },
  { id:'a-012', ts:'2025-09-06T18:03:00Z', clientId:'metro-finance', app:'Perplexity', assetKind:'Application',
    family:'UNSANCTIONED_USE', subtype:'UsageWithoutApproval', severity:'Medium',
    details:'12 users adopted Perplexity without policy exemption.',
    frameworks:['NIST','EU_AI'], status:'Unassigned' },
  { id:'a-013', ts:'2025-09-06T09:47:00Z', clientId:'techcorp-solutions', app:'UiPath', assetKind:'Application',
    family:'CONFIG_DRIFT', subtype:'NewIntegration', severity:'Low',
    details:'New Gmail connector enabled for automation workflows.',
    frameworks:['NIST'], status:'Pending' },
  { id:'a-014', ts:'2025-09-05T22:20:00Z', clientId:'acme-health', app:'Agentforce', assetKind:'Agent',
    family:'CONFIG_DRIFT', subtype:'GuardrailDisabled', severity:'High',
    details:'PII redaction guardrail disabled for agent reply step.',
    frameworks:['NIST','ISO_42001'], status:'Unassigned' },
  { id:'a-015', ts:'2025-09-05T16:12:00Z', clientId:'metro-finance', app:'ChatGPT', assetKind:'Application',
    family:'ENFORCEMENT', subtype:'Blocked', severity:'Low',
    details:'2 prompts blocked for disallowed medical advice.',
    frameworks:['EU_AI'], status:'AI Resolved', count:2 },
  { id:'a-016', ts:'2025-09-05T11:39:00Z', clientId:'techcorp-solutions', app:'M365 Copilot', assetKind:'Application',
    family:'POLICY_VIOLATION', subtype:'RegulatedClaim', severity:'Medium',
    details:'Unverified financial performance claim detected; rewritten.',
    frameworks:['EU_AI','CO_SB21_169'], status:'Pending' },
  { id:'a-017', ts:'2025-09-04T20:02:00Z', clientId:'acme-health', app:'Now Assist', assetKind:'Agent',
    family:'USAGE_ANOMALY', subtype:'NewDept', severity:'Low',
    details:'HR adopted agent for PTO workflows (first use).',
    frameworks:['NIST'], status:'Pending' },
  { id:'a-018', ts:'2025-09-04T14:44:00Z', clientId:'metro-finance', app:'Workday AI', assetKind:'Application',
    family:'SENSITIVE_DATA', subtype:'PII', severity:'High',
    details:'Employee SSN ***-**-9213 detected in prompt.',
    frameworks:['NYC_144','NIST'], status:'Unassigned' },
  { id:'a-019', ts:'2025-09-04T09:31:00Z', clientId:'techcorp-solutions', app:'Glean', assetKind:'Application',
    family:'CONFIG_DRIFT', subtype:'ScopeWidened', severity:'Medium',
    details:'Search scope expanded to "All SharePoint sites".',
    frameworks:['NIST','ISO_42001'], status:'Unassigned' },
  { id:'a-020', ts:'2025-09-03T23:18:00Z', clientId:'acme-health', app:'Fin (Intercom)', assetKind:'Agent',
    family:'POLICY_VIOLATION', subtype:'Toxic', severity:'Low',
    details:'Toxic language detected in training utterance; filtered.',
    frameworks:['EU_AI'], status:'AI Resolved' },
  { id:'a-021', ts:'2025-09-03T18:27:00Z', clientId:'metro-finance', app:'Brex AI', assetKind:'Application',
    family:'SENSITIVE_DATA', subtype:'Financial', severity:'Medium',
    details:'Invoice with bank routing exposed; masked in context.',
    frameworks:['NIST'], status:'Pending' },
  { id:'a-022', ts:'2025-09-03T07:55:00Z', clientId:'techcorp-solutions', app:'Zendesk', assetKind:'Application',
    family:'USAGE_ANOMALY', subtype:'GeoAnomaly', severity:'Medium',
    details:'Significant interactions from unexpected GEO region.',
    frameworks:['NIST'], status:'Unassigned' },
  { id:'a-023', ts:'2025-09-02T21:10:00Z', clientId:'acme-health', app:'Agentforce', assetKind:'Agent',
    family:'AGENT_RISK', subtype:'PrivilegedAction', severity:'High',
    details:'Agent attempted to disable MFA for VIP user.',
    frameworks:['NIST','EU_AI'], status:'Unassigned' },
  { id:'a-024', ts:'2025-09-02T15:42:00Z', clientId:'metro-finance', app:'Perplexity', assetKind:'Application',
    family:'ENFORCEMENT', subtype:'Warned', severity:'Low',
    details:'User warned for unsanctioned tool use (policy reminder).',
    frameworks:['NIST'], status:'AI Resolved' },
  { id:'a-025', ts:'2025-09-02T10:03:00Z', clientId:'techcorp-solutions', app:'Cursor', assetKind:'Application',
    family:'SENSITIVE_DATA', subtype:'SourceCode', severity:'Medium',
    details:'Internal package token found in generated snippet; blocked.',
    frameworks:['NIST','ISO_42001'], status:'Unassigned' },
  { id:'a-026', ts:'2025-09-01T22:59:00Z', clientId:'acme-health', app:'M365 Copilot', assetKind:'Application',
    family:'COMPLIANCE_GAP', subtype:'EvidenceOverdue', severity:'Medium',
    details:'ISO 42001 evidence for MON-2 overdue by 14 days.',
    frameworks:['ISO_42001'], status:'Unassigned' },
  { id:'a-027', ts:'2025-09-01T17:21:00Z', clientId:'metro-finance', app:'Gong', assetKind:'Application',
    family:'UNSANCTIONED_USE', subtype:'UsageWithoutApproval', severity:'Low',
    details:'2 users trialed Gong without approval; 11 interactions.',
    frameworks:['NIST'], status:'Pending' },
  { id:'a-028', ts:'2025-09-01T08:15:00Z', clientId:'techcorp-solutions', app:'Agentforce', assetKind:'Agent',
    family:'ENFORCEMENT', subtype:'Quarantined', severity:'High',
    details:'Agent flow quarantined after repeated policy violations.',
    frameworks:['NIST','EU_AI'], status:'Unassigned' },
  { id:'a-029', ts:'2025-08-31T23:05:00Z', clientId:'acme-health', app:'HubSpot AI', assetKind:'Application',
    family:'POLICY_VIOLATION', subtype:'Copyright', severity:'Medium',
    details:'Potential copyrighted text in draft email; replaced summary.',
    frameworks:['EU_AI'], status:'Complete' },
  { id:'a-030', ts:'2025-08-31T16:44:00Z', clientId:'metro-finance', app:'Workday AI', assetKind:'Application',
    family:'POLICY_VIOLATION', subtype:'Bias', severity:'High',
    details:'Potentially discriminatory phrasing in screening prompt.',
    frameworks:['NYC_144','EU_AI'], status:'Unassigned' },
  { id:'a-031', ts:'2025-08-31T10:02:00Z', clientId:'techcorp-solutions', app:'Midjourney', assetKind:'Application',
    family:'UNSANCTIONED_USE', subtype:'NewApp', severity:'Low',
    details:'Midjourney first seen (3 users).',
    frameworks:['NIST'], status:'Pending' },
  { id:'a-032', ts:'2025-08-30T21:39:00Z', clientId:'acme-health', app:'ChatGPT', assetKind:'Application',
    family:'USAGE_ANOMALY', subtype:'Spike', severity:'Medium',
    details:'2.7× usage during product launch week.',
    frameworks:['NIST'], status:'Pending' },
  { id:'a-033', ts:'2025-08-30T15:28:00Z', clientId:'metro-finance', app:'Tipalti', assetKind:'Application',
    family:'SENSITIVE_DATA', subtype:'Financial', severity:'Medium',
    details:'Supplier bank info pasted in prompt; masked.',
    frameworks:['NIST'], status:'Complete' },
  { id:'a-034', ts:'2025-08-30T07:50:00Z', clientId:'techcorp-solutions', app:'GitHub Copilot', assetKind:'Application',
    family:'ENFORCEMENT', subtype:'Blocked', severity:'Low',
    details:'Generated code matched GPL header; block applied.',
    frameworks:['NIST'], status:'AI Resolved' },
  { id:'a-035', ts:'2025-08-29T22:14:00Z', clientId:'acme-health', app:'Now Assist', assetKind:'Agent',
    family:'CONFIG_DRIFT', subtype:'RetentionReduced', severity:'Medium',
    details:'Conversation retention reduced from 30→7 days.',
    frameworks:['ISO_42001'], status:'Unassigned' },
  { id:'a-036', ts:'2025-08-29T17:03:00Z', clientId:'metro-finance', app:'Clari', assetKind:'Application',
    family:'USAGE_ANOMALY', subtype:'OffHours', severity:'Low',
    details:'Late-night forecasting activity by 6 users.',
    frameworks:['NIST'], status:'Pending' },
  { id:'a-037', ts:'2025-08-29T09:22:00Z', clientId:'techcorp-solutions', app:'Perplexity', assetKind:'Application',
    family:'UNSANCTIONED_USE', subtype:'UsageWithoutApproval', severity:'Medium',
    details:'8 users using Perplexity; policy recommends ChatGPT.',
    frameworks:['NIST','EU_AI'], status:'Unassigned' },
  { id:'a-038', ts:'2025-08-28T20:18:00Z', clientId:'acme-health', app:'Agentforce', assetKind:'Agent',
    family:'AGENT_RISK', subtype:'SODViolation', severity:'High',
    details:'Agent attempted creator+approver roles in same workflow.',
    frameworks:['NIST'], status:'Unassigned' },
  { id:'a-039', ts:'2025-08-28T11:57:00Z', clientId:'metro-finance', app:'Zendesk', assetKind:'Application',
    family:'POLICY_VIOLATION', subtype:'PromptInjection', severity:'Medium',
    details:'Injection string "[IGNORE ALL PREVIOUS]" detected; sanitized.',
    frameworks:['NIST','EU_AI'], status:'Complete' },
  { id:'a-040', ts:'2025-08-28T07:41:00Z', clientId:'techcorp-solutions', app:'Glean', assetKind:'Application',
    family:'COMPLIANCE_GAP', subtype:'NotImplemented', severity:'Medium',
    details:'NIST MON-3 logging control not implemented for Glean.',
    frameworks:['NIST'], status:'Unassigned' },
  { id:'a-041', ts:'2025-08-27T22:06:00Z', clientId:'acme-health', app:'Brex AI', assetKind:'Application',
    family:'SENSITIVE_DATA', subtype:'Confidential', severity:'Medium',
    details:'Board deck draft attached; marked confidential.',
    frameworks:['NIST'], status:'Pending' },
  { id:'a-042', ts:'2025-08-27T15:12:00Z', clientId:'metro-finance', app:'Workday AI', assetKind:'Application',
    family:'ENFORCEMENT', subtype:'Redacted', severity:'Low',
    details:'Personal addresses automatically redacted (5 records).',
    frameworks:['NYC_144'], status:'AI Resolved', count:5 },
  { id:'a-043', ts:'2025-08-27T08:44:00Z', clientId:'techcorp-solutions', app:'UiPath', assetKind:'Application',
    family:'CONFIG_DRIFT', subtype:'GuardrailDisabled', severity:'High',
    details:'PHI filter disabled in automation step.',
    frameworks:['NIST','ISO_42001'], status:'Unassigned' },
  { id:'a-044', ts:'2025-08-26T21:30:00Z', clientId:'acme-health', app:'Perplexity', assetKind:'Application',
    family:'ENFORCEMENT', subtype:'Warned', severity:'Low',
    details:'Policy reminder issued to 7 users.',
    frameworks:['NIST'], status:'AI Resolved', usersAffected:7 },
  { id:'a-045', ts:'2025-08-26T13:15:00Z', clientId:'metro-finance', app:'HubSpot AI', assetKind:'Application',
    family:'USAGE_ANOMALY', subtype:'Spike', severity:'Medium',
    details:'Lead import campaign drove 2.1× usage.',
    frameworks:['NIST'], status:'Pending' },
  { id:'a-046', ts:'2025-08-26T06:59:00Z', clientId:'techcorp-solutions', app:'SmartScheduler', assetKind:'Agent',
    family:'AGENT_RISK', subtype:'PrivilegedAction', severity:'High',
    details:'Attempted to delete user calendar events en masse.',
    frameworks:['NIST','EU_AI'], status:'Unassigned' },
  { id:'a-047', ts:'2025-08-25T20:41:00Z', clientId:'acme-health', app:'M365 Copilot', assetKind:'Application',
    family:'COMPLIANCE_GAP', subtype:'Regression', severity:'Medium',
    details:'Coverage dropped from 88%→84% after org change.',
    frameworks:['ISO_42001'], status:'Unassigned' },
  { id:'a-048', ts:'2025-08-25T12:22:00Z', clientId:'metro-finance', app:'Gong', assetKind:'Application',
    family:'POLICY_VIOLATION', subtype:'Copyright', severity:'Low',
    details:'Sales email draft contained verbatim copy; replaced summary.',
    frameworks:['EU_AI'], status:'Complete' },
  { id:'a-049', ts:'2025-08-25T07:03:00Z', clientId:'techcorp-solutions', app:'ChatGPT', assetKind:'Application',
    family:'SENSITIVE_DATA', subtype:'PII', severity:'High',
    details:'Customer email list pasted; masked and logged.',
    frameworks:['NIST','ISO_42001'], status:'Unassigned', count:120 },
  { id:'a-050', ts:'2025-08-24T19:48:00Z', clientId:'acme-health', app:'Agentforce', assetKind:'Agent',
    family:'ENFORCEMENT', subtype:'Blocked', severity:'Low',
    details:'Action blocked: "export all contacts" outside scope.',
    frameworks:['NIST'], status:'AI Resolved' },
];