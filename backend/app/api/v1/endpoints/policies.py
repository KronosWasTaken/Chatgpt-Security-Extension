from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from typing import List, Optional
from uuid import UUID
from app.models import Client, ClientPolicy
from sqlalchemy import select, and_

router = APIRouter()

# Response Models
class PolicyRuleResponse(BaseModel):
    id: str
    category: str  # 'PII', 'PHI', 'Secrets', 'SourceCode', 'CustomerData'
    enabled: bool
    effect: str  # 'Allow', 'Redact', 'Block'
    description: str

class ClientPolicyResponse(BaseModel):
    id: str
    clientId: str
    name: str
    rules: List[PolicyRuleResponse]
    yaml: str
    lastModified: str
    isActive: bool

class PolicyTemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    industry: str
    rules: List[PolicyRuleResponse]
    yaml: str

# Endpoints
@router.get("/clients/{client_id}/policies", response_model=List[ClientPolicyResponse])
async def get_client_policies(
    client_id: str,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get policies for a specific client"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        return []
    
    # Verify client belongs to user's MSP
    client_query = select(Client).where(
        and_(
            Client.id == UUID(client_id),
            Client.msp_id == UUID(user['msp_id'])
        )
    )
    client_result = await session.execute(client_query)
    client = client_result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get policies for this client
    policies_query = select(ClientPolicy).where(
        ClientPolicy.client_id == UUID(client_id)
    ).order_by(ClientPolicy.last_modified.desc())
    
    policies_result = await session.execute(policies_query)
    policies = []
    
    for policy in policies_result.scalars().all():
        rules = []
        if policy.rules:
            for rule in policy.rules:
                rules.append(PolicyRuleResponse(
                    id=rule.get('id', ''),
                    category=rule.get('category', ''),
                    enabled=rule.get('enabled', False),
                    effect=rule.get('effect', ''),
                    description=rule.get('description', '')
                ))
        
        policies.append(ClientPolicyResponse(
            id=str(policy.id),
            clientId=client_id,
            name=policy.name,
            rules=rules,
            yaml=policy.yaml or "",
            lastModified=policy.last_modified,
            isActive=policy.is_active
        ))
    
    return policies

@router.get("/templates", response_model=List[PolicyTemplateResponse])
async def get_policy_templates(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get policy templates"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        return []
    
    # For now, return hardcoded templates matching frontend data
    # In the future, this could be stored in a database table
    templates = [
        PolicyTemplateResponse(
            id="financial",
            name="Financial Services",
            description="Comprehensive data protection for banking, investment, and financial institutions with SOX compliance",
            industry="Financial",
            rules=[
                PolicyRuleResponse(id="pii-fin", category="PII", enabled=True, effect="Block", description="SSN, driver license, passport numbers"),
                PolicyRuleResponse(id="phi-fin", category="PHI", enabled=False, effect="Allow", description="Medical information (not applicable)"),
                PolicyRuleResponse(id="secrets-fin", category="Secrets", enabled=True, effect="Block", description="API keys, certificates, credentials"),
                PolicyRuleResponse(id="source-fin", category="SourceCode", enabled=True, effect="Redact", description="Proprietary algorithms, trading code"),
                PolicyRuleResponse(id="customer-fin", category="CustomerData", enabled=True, effect="Block", description="Account numbers, transaction data, credit info")
            ],
            yaml="# Financial Services AI Policy\nname: \"Financial Services Policy\"\nversion: \"1.0\"\ncontrols:\n  pii:\n    enabled: true\n    action: block\n    patterns:\n      - ssn\n      - drivers_license\n      - passport\n  secrets:\n    enabled: true \n    action: block\n    patterns:\n      - api_key\n      - certificate\n      - password\n  customer_data:\n    enabled: true\n    action: block\n    patterns:\n      - account_number\n      - routing_number\n      - credit_card"
        ),
        PolicyTemplateResponse(
            id="healthcare",
            name="Healthcare & Life Sciences",
            description="HIPAA-compliant policies for protecting patient data and medical information in AI interactions",
            industry="Healthcare",
            rules=[
                PolicyRuleResponse(id="pii-health", category="PII", enabled=True, effect="Block", description="Patient identifiers, SSN, addresses"),
                PolicyRuleResponse(id="phi-health", category="PHI", enabled=True, effect="Block", description="Protected health information, medical records"),
                PolicyRuleResponse(id="secrets-health", category="Secrets", enabled=True, effect="Block", description="System credentials, API tokens"),
                PolicyRuleResponse(id="source-health", category="SourceCode", enabled=True, effect="Redact", description="Proprietary medical algorithms"),
                PolicyRuleResponse(id="customer-health", category="CustomerData", enabled=True, effect="Block", description="Patient records, treatment data")
            ],
            yaml="# Healthcare AI Policy\nname: \"Healthcare HIPAA Policy\" \nversion: \"1.0\"\ncontrols:\n  phi:\n    enabled: true\n    action: block\n    patterns:\n      - medical_record_number\n      - diagnosis_code\n      - treatment_plan\n  pii:\n    enabled: true\n    action: block\n    patterns:\n      - patient_name\n      - date_of_birth\n      - ssn"
        ),
        PolicyTemplateResponse(
            id="insurance",
            name="Insurance",
            description="Risk management and claim data protection for insurance carriers and brokers",
            industry="Insurance",
            rules=[
                PolicyRuleResponse(id="pii-ins", category="PII", enabled=True, effect="Redact", description="Policyholder personal information"),
                PolicyRuleResponse(id="phi-ins", category="PHI", enabled=True, effect="Block", description="Medical information in claims"),
                PolicyRuleResponse(id="secrets-ins", category="Secrets", enabled=True, effect="Block", description="System access credentials"),
                PolicyRuleResponse(id="source-ins", category="SourceCode", enabled=True, effect="Redact", description="Risk assessment algorithms"),
                PolicyRuleResponse(id="customer-ins", category="CustomerData", enabled=True, effect="Redact", description="Policy details, claim information")
            ],
            yaml="# Insurance AI Policy\nname: \"Insurance Data Policy\"\nversion: \"1.0\"  \ncontrols:\n  pii:\n    enabled: true\n    action: redact\n    patterns:\n      - policy_number\n      - claim_number\n      - driver_license\n  customer_data:\n    enabled: true\n    action: redact\n    patterns:\n      - premium_amount\n      - coverage_details"
        ),
        PolicyTemplateResponse(
            id="retail",
            name="Retail & E-commerce",
            description="Customer data protection and competitive intelligence safeguards for retail operations",
            industry="Retail",
            rules=[
                PolicyRuleResponse(id="pii-retail", category="PII", enabled=True, effect="Redact", description="Customer contact information"),
                PolicyRuleResponse(id="phi-retail", category="PHI", enabled=False, effect="Allow", description="Medical data (not applicable)"),
                PolicyRuleResponse(id="secrets-retail", category="Secrets", enabled=True, effect="Block", description="Payment processing credentials"),
                PolicyRuleResponse(id="source-retail", category="SourceCode", enabled=True, effect="Redact", description="Recommendation algorithms, pricing logic"),
                PolicyRuleResponse(id="customer-retail", category="CustomerData", enabled=True, effect="Redact", description="Purchase history, payment methods")
            ],
            yaml="# Retail AI Policy\nname: \"Retail Customer Policy\"\nversion: \"1.0\"\ncontrols:\n  pii:\n    enabled: true\n    action: redact\n    patterns:\n      - email_address\n      - phone_number\n      - shipping_address\n  customer_data:\n    enabled: true\n    action: redact\n    patterns:\n      - order_history\n      - payment_method"
        )
    ]
    
    return templates
