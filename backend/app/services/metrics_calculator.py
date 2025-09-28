from typing import Dict, Any, List
from datetime import date, timedelta
from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import (
    Client, ClientAIServices, Alert, AgentEngagement, ClientAIServiceUsage, UserEngagement
)

class MetricsCalculator:
    """Service to calculate client metrics dynamically from database data"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def calculate_client_metrics(self, client_id: str, target_date: date = None, department: str = None) -> Dict[str, Any]:
        """Calculate all metrics for a specific client with optional department filtering"""
        if target_date is None:
            target_date = date.today()
        
        # Calculate apps monitored (count of unique AI services)
        apps_monitored = await self._calculate_apps_monitored(client_id, department)
        
        # Calculate interactions monitored (sum of daily interactions)
        interactions_monitored = await self._calculate_interactions_monitored(client_id, target_date, department)
        
        # Calculate agents deployed (count of active agents)
        agents_deployed = await self._calculate_agents_deployed(client_id)
        
        # Calculate risk score (based on alerts and unsanctioned usage)
        risk_score = await self._calculate_risk_score(client_id, target_date, department)
        
        # Calculate compliance coverage (based on policy adherence)
        compliance_coverage = await self._calculate_compliance_coverage(client_id)
        
        return {
            "apps_monitored": apps_monitored,
            "interactions_monitored": interactions_monitored,
            "agents_deployed": agents_deployed,
            "risk_score": risk_score,
            "compliance_coverage": compliance_coverage,
            "department": department  # Include department in response for clarity
        }
    
    async def _calculate_apps_monitored(self, client_id: str, department: str = None) -> int:
        """Count unique AI services for the client, optionally filtered by department"""
        if department:
            # Count unique AI services used by the department
            query = select(func.count(ClientAIServiceUsage.ai_service_id.distinct())).where(
                and_(
                    ClientAIServiceUsage.client_id == client_id,
                    ClientAIServiceUsage.department == department
                )
            )
        else:
            # Count all unique AI services for the client
            query = select(func.count(ClientAIServices.id.distinct())).where(
                ClientAIServices.client_id == client_id
            )
        
        result = await self.session.execute(query)
        return result.scalar() or 0
    
    async def _calculate_interactions_monitored(self, client_id: str, target_date: date, department: str = None) -> int:
        """Calculate total daily interactions for the client from ClientAIServiceUsage only"""
        conditions = [
            ClientAIServiceUsage.client_id == client_id,
            ClientAIServiceUsage.created_at >= target_date,
            ClientAIServiceUsage.created_at < target_date + timedelta(days=1)
        ]
        
        # Add department filter if specified
        if department:
            conditions.append(ClientAIServiceUsage.department == department)
        
        query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
            and_(*conditions)
        )
        
        result = await self.session.execute(query)
        return result.scalar() or 0
    
    async def _calculate_agents_deployed(self, client_id: str) -> int:
        """Count active agents for the client"""
        query = select(func.count(AgentEngagement.id)).where(
            and_(
                AgentEngagement.client_id == client_id,
                AgentEngagement.deployed > 0
            )
        )
        result = await self.session.execute(query)
        return result.scalar() or 0
    
    async def _calculate_risk_score(self, client_id: str, target_date: date, department: str = None) -> float:
        """Calculate risk score based on alerts and unsanctioned usage"""
        # Base risk score
        base_risk = 0.0
        
        # High severity alerts add 25 points each
        high_alerts_query = select(func.count(Alert.id)).where(
            and_(
                Alert.client_id == client_id,
                Alert.severity == "High",
                Alert.created_at >= target_date - timedelta(days=30)
            )
        )
        high_alerts_result = await self.session.execute(high_alerts_query)
        high_alerts = high_alerts_result.scalar() or 0
        base_risk += high_alerts * 25
        
        # Medium severity alerts add 15 points each
        medium_alerts_query = select(func.count(Alert.id)).where(
            and_(
                Alert.client_id == client_id,
                Alert.severity == "Medium",
                Alert.created_at >= target_date - timedelta(days=30)
            )
        )
        medium_alerts_result = await self.session.execute(medium_alerts_query)
        medium_alerts = medium_alerts_result.scalar() or 0
        base_risk += medium_alerts * 15
        
        # Unsanctioned AI services add 20 points each
        unsanctioned_query = select(func.count(ClientAIServices.id)).where(
            and_(
                ClientAIServices.client_id == client_id,
                ClientAIServices.status == "Unsanctioned"
            )
        )
        unsanctioned_result = await self.session.execute(unsanctioned_query)
        unsanctioned_count = unsanctioned_result.scalar() or 0
        base_risk += unsanctioned_count * 20
        
        # Cap at 100
        return min(base_risk, 100.0)
    
    async def _calculate_compliance_coverage(self, client_id: str) -> float:
        """Calculate compliance coverage based on policy adherence"""
        # This is a simplified calculation
        # In reality, you'd check against specific compliance frameworks
        
        # Count total AI services
        total_services_query = select(func.count(ClientAIServices.id)).where(
            ClientAIServices.client_id == client_id
        )
        total_result = await self.session.execute(total_services_query)
        total_services = total_result.scalar() or 0
        
        if total_services == 0:
            return 0.0
        
        # Count permitted services
        permitted_services_query = select(func.count(ClientAIServices.id)).where(
            and_(
                ClientAIServices.client_id == client_id,
                ClientAIServices.status == "Permitted"
            )
        )
        permitted_result = await self.session.execute(permitted_services_query)
        permitted_services = permitted_result.scalar() or 0
        
        # Calculate percentage
        coverage = (permitted_services / total_services) * 100
        return round(coverage, 1)
    
    # Note: Department and application engagement calculations are now handled by EngagementService
    # This eliminates the need for redundant engagement tables and provides real-time calculations
    
    async def calculate_agent_engagement(self, client_id: str, target_date: date = None) -> List[Dict[str, Any]]:
        """Calculate agent engagement metrics"""
        if target_date is None:
            target_date = date.today()
        
        # Get agent data
        query = select(AgentEngagement).where(
            and_(
                AgentEngagement.client_id == client_id,
                AgentEngagement.date == target_date
            )
        )
        result = await self.session.execute(query)
        agents = result.scalars().all()
        
        engagement_data = []
        for agent in agents:
            engagement_data.append({
                "agent": agent.agent,
                "vendor": agent.vendor,
                "icon": agent.icon,
                "deployed": agent.deployed,
                "avg_prompts_per_day": agent.avg_prompts_per_day,
                "flagged_actions": agent.flagged_actions,
                "trend_pct_7d": agent.trend_pct_7d,
                "status": agent.status,
                "last_activity_iso": agent.last_activity_iso,
                "associated_apps": agent.associated_apps
            })
        
        return engagement_data
