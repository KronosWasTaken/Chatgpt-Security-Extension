from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from typing import List, Optional
from uuid import UUID
from app.models import Client, ClientComplianceReport, PortfolioValueReport, MSP
from sqlalchemy import select, and_

router = APIRouter()

# Response Models
class CoverageResponse(BaseModel):
    percentage: int
    implemented: int
    total: int

class EvidenceResponse(BaseModel):
    percentage: int
    complete: int
    total: int

class AlertSummaryResponse(BaseModel):
    family: str
    count: int
    severity: str  # 'Low', 'Medium', 'High', 'Critical'

class EngagementHighlightResponse(BaseModel):
    topApps: List[dict]
    topAgents: List[dict]

class ClientComplianceReportResponse(BaseModel):
    clientId: str
    clientName: str
    period: str
    coverage: CoverageResponse
    evidence: EvidenceResponse
    alertSummary: List[AlertSummaryResponse]
    implementedControls: List[str]
    openGaps: List[str]
    engagementHighlights: EngagementHighlightResponse
    nextActions: List[str]

class PortfolioValueReportResponse(BaseModel):
    period: str
    coverageDelta: float
    totalAlerts: List[dict]
    topStandardizations: List[str]
    estimatedSavings: dict
    highlights: List[str]
    nextActions: List[str]

# Endpoints
@router.get("/clients/{client_id}/compliance", response_model=ClientComplianceReportResponse)
async def get_client_compliance_report(
    client_id: str,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get compliance report for a specific client"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
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
    
    # Get latest compliance report for this client
    report_query = select(ClientComplianceReport).where(
        ClientComplianceReport.client_id == UUID(client_id)
    ).order_by(ClientComplianceReport.created_at.desc())
    
    report_result = await session.execute(report_query)
    report = report_result.scalar_one_or_none()
    
    if not report:
        # Return sample data if no report exists
        # In a real implementation, you might want to generate a report on-the-fly
        return ClientComplianceReportResponse(
            clientId=client_id,
            clientName=client.name,
            period="Q3 2025",
            coverage=CoverageResponse(percentage=87, implemented=52, total=60),
            evidence=EvidenceResponse(percentage=92, complete=55, total=60),
            alertSummary=[
                AlertSummaryResponse(family="Unsanctioned Use", count=1, severity="High"),
                AlertSummaryResponse(family="Sensitive Data", count=2, severity="High"),
                AlertSummaryResponse(family="Enforcement", count=1, severity="Low"),
                AlertSummaryResponse(family="Config Drift", count=1, severity="High")
            ],
            implementedControls=[
                "AI.GOV-1.1: AI governance structure established",
                "AI.MGT-2.3: AI risk assessment framework deployed",
                "AI.RMF-3.1: Automated monitoring for PII/PHI detection",
                "AI.RMF-4.2: Real-time policy enforcement controls",
                "AI.GOV-5.1: Incident response procedures for AI systems"
            ],
            openGaps=[
                "AI.RMF-2.4: Bias testing framework (Evidence due: Oct 15)",
                "AI.GOV-3.2: Third-party AI vendor assessments (In progress)",
                "AI.MGT-1.5: AI system inventory completeness (85% complete)"
            ],
            engagementHighlights=EngagementHighlightResponse(
                topApps=[
                    {"name": "ChatGPT", "change": 15.2},
                    {"name": "M365 Copilot", "change": -8.7},
                    {"name": "GitHub Copilot", "change": 23.1}
                ],
                topAgents=[
                    {"name": "DataAnalyzer", "change": 45.3},
                    {"name": "ReportBot", "change": -12.4}
                ]
            ),
            nextActions=[
                "Complete bias testing framework implementation by Oct 15",
                "Review and approve 3 pending vendor assessments",
                "Address PII detection bypass in Finance department configuration",
                "Investigate Perplexity usage spike and determine approval status"
            ]
        )
    
    # Parse alert summary from JSONB
    alert_summary = []
    if report.alert_summary:
        for alert in report.alert_summary:
            alert_summary.append(AlertSummaryResponse(
                family=alert.get('family', ''),
                count=alert.get('count', 0),
                severity=alert.get('severity', 'Low')
            ))
    
    # Parse engagement highlights from JSONB
    engagement_highlights = EngagementHighlightResponse(
        topApps=report.engagement_highlights.get('topApps', []) if report.engagement_highlights else [],
        topAgents=report.engagement_highlights.get('topAgents', []) if report.engagement_highlights else []
    )
    
    return ClientComplianceReportResponse(
        clientId=client_id,
        clientName=client.name,
        period=report.period,
        coverage=CoverageResponse(
            percentage=int(report.coverage_percentage),
            implemented=report.coverage_implemented,
            total=report.coverage_total
        ),
        evidence=EvidenceResponse(
            percentage=int(report.evidence_percentage),
            complete=report.evidence_complete,
            total=report.evidence_total
        ),
        alertSummary=alert_summary,
        implementedControls=report.implemented_controls or [],
        openGaps=report.open_gaps or [],
        engagementHighlights=engagement_highlights,
        nextActions=report.next_actions or []
    )

@router.get("/portfolio", response_model=PortfolioValueReportResponse)
async def get_portfolio_report(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get portfolio value report for MSP"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    msp_id = UUID(user['msp_id'])
    
    # Get latest portfolio report
    report_query = select(PortfolioValueReport).where(
        PortfolioValueReport.msp_id == msp_id
    ).order_by(PortfolioValueReport.created_at.desc())
    
    report_result = await session.execute(report_query)
    report = report_result.scalar_one_or_none()
    
    if not report:
        # Return sample data if no report exists
        # In a real implementation, you might want to generate a report on-the-fly
        return PortfolioValueReportResponse(
            period="Q3 2025",
            coverageDelta=12.3,
            totalAlerts=[
                {"family": "Unsanctioned Use", "count": 3},
                {"family": "Sensitive Data", "count": 5},
                {"family": "Agent Risk", "count": 2},
                {"family": "Policy Violation", "count": 1},
                {"family": "Usage Anomaly", "count": 2},
                {"family": "Compliance Gap", "count": 3},
                {"family": "Config Drift", "count": 2},
                {"family": "Enforcement", "count": 4}
            ],
            topStandardizations=[
                "NIST AI RMF adoption across 85% of clients",
                "Unified PII/PHI detection policies (3 clients)",
                "Standardized incident response workflows",
                "Common agent deployment guardrails"
            ],
            estimatedSavings={
                "licenseOptimization": 234000,
                "riskReduction": 567000,
                "complianceEfficiency": 189000
            },
            highlights=[
                "Prevented 23 potential data breaches through automated detection",
                "Reduced compliance prep time by 40% via standardized frameworks",
                "Achieved 95% client satisfaction with AI governance platform",
                "Onboarded 2 new clients with accelerated 30-day deployment"
            ],
            nextActions=[
                "Expand EU AI Act readiness assessments to all clients",
                "Deploy advanced agent risk controls to 3 remaining clients",
                "Conduct quarterly business review presentations",
                "Pilot predictive compliance gap identification system"
            ]
        )
    
    # Parse data from JSONB fields
    total_alerts = []
    if report.total_alerts:
        for alert in report.total_alerts:
            total_alerts.append({
                "family": alert.get('family', ''),
                "count": alert.get('count', 0)
            })
    
    estimated_savings = report.estimated_savings or {}
    
    return PortfolioValueReportResponse(
        period=report.period,
        coverageDelta=float(report.coverage_delta),
        totalAlerts=total_alerts,
        topStandardizations=report.top_standardizations or [],
        estimatedSavings=estimated_savings,
        highlights=report.highlights or [],
        nextActions=report.next_actions or []
    )
