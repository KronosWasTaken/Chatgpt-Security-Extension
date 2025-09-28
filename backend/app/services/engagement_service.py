"""
Engagement Service - Calculates all engagement data at runtime from ClientAIServiceUsage
Eliminates the need for redundant engagement tables by computing everything dynamically.
"""

from typing import Dict, Any, List, Optional
from datetime import date, timedelta
from sqlalchemy import select, func, and_, desc, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import ClientAIServiceUsage, ClientAIServices, User, Alert, UserEngagement, AgentEngagement, ProductivityCorrelation
from sqlalchemy.dialects.postgresql import UUID


class EngagementService:
    """Service to calculate engagement data at runtime from ClientAIServiceUsage"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_department_engagement(self, client_id: str, target_date: date, department: str = None) -> List[Dict[str, Any]]:
        """Get department engagement data calculated from ClientAIServiceUsage"""
        
        conditions = [
            ClientAIServiceUsage.client_id == client_id,
            ClientAIServiceUsage.created_at >= target_date,
            ClientAIServiceUsage.created_at < target_date + timedelta(days=1)
        ]
        
        if department:
            conditions.append(ClientAIServiceUsage.department == department)
        
        # Calculate department metrics
        query = select(
            ClientAIServiceUsage.department,
            func.sum(ClientAIServiceUsage.daily_interactions).label('interactions'),
            func.count(func.distinct(ClientAIServiceUsage.user_id)).label('active_users')
        ).where(
            and_(*conditions)
        ).group_by(ClientAIServiceUsage.department)
        
        result = await self.session.execute(query)
        departments = []
        
        for row in result:
            dept_name = row.department or 'Unknown'
            
            # Calculate 7-day trend
            trend = await self._calculate_7d_trend(client_id, dept_name, target_date)
            
            departments.append({
                'department': dept_name,
                'interactions': row.interactions or 0,
                'active_users': row.active_users or 0,
                'pct_change_vs_prev_7d': trend
            })
        
        return departments
    
    async def get_application_engagement(self, client_id: str, target_date: date, department: str = None) -> List[Dict[str, Any]]:
        """Get application engagement data calculated from ClientAIServiceUsage"""
        
        conditions = [
            ClientAIServiceUsage.client_id == client_id,
            ClientAIServiceUsage.created_at >= target_date,
            ClientAIServiceUsage.created_at < target_date + timedelta(days=1)
        ]
        
        if department:
            conditions.append(ClientAIServiceUsage.department == department)
        
        # Join with ClientAIServices to get application details
        query = select(
            ClientAIServiceUsage.ai_service_id,
            ClientAIServices.name.label('application'),
            ClientAIServices.vendor,
            ClientAIServices.icon,
            func.sum(ClientAIServiceUsage.daily_interactions).label('interactions_per_day'),
            func.count(func.distinct(ClientAIServiceUsage.user_id)).label('active_users')
        ).join(
            ClientAIServices, ClientAIServiceUsage.ai_service_id == ClientAIServices.id
        ).where(
            and_(*conditions)
        ).group_by(
            ClientAIServiceUsage.ai_service_id,
            ClientAIServices.name,
            ClientAIServices.vendor,
            ClientAIServices.icon
        )
        
        result = await self.session.execute(query)
        applications = []
        
        for row in result:
            # Calculate 7-day trend
            trend = await self._calculate_7d_trend_for_service(client_id, row.ai_service_id, target_date)
            
            # Calculate utilization based on interactions
            utilization = self._calculate_utilization(row.interactions_per_day or 0)
            
            applications.append({
                'ai_service_id': str(row.ai_service_id),
                'application': row.application,
                'vendor': row.vendor,
                'icon': row.icon,
                'interactions_per_day': row.interactions_per_day or 0,
                'active_users': row.active_users or 0,
                'trend_pct_7d': trend,
                'utilization': utilization,
                'recommendation': self._get_utilization_recommendation(utilization)
            })
        
        return applications
    
    async def get_user_engagement(self, client_id: str, target_date: date, department: str = None) -> List[Dict[str, Any]]:
        """Get user engagement data calculated from ClientAIServiceUsage"""
        
        conditions = [
            ClientAIServiceUsage.client_id == client_id,
            ClientAIServiceUsage.created_at >= target_date,
            ClientAIServiceUsage.created_at < target_date + timedelta(days=1)
        ]
        
        if department:
            conditions.append(ClientAIServiceUsage.department == department)
        
        # Join with User to get user details
        query = select(
            ClientAIServiceUsage.user_id,
            User.name,
            ClientAIServiceUsage.department,
            func.avg(ClientAIServiceUsage.daily_interactions).label('avg_daily_interactions')
        ).join(
            User, ClientAIServiceUsage.user_id == User.id
        ).where(
            and_(*conditions)
        ).group_by(
            ClientAIServiceUsage.user_id,
            User.name,
            ClientAIServiceUsage.department
        )
        
        result = await self.session.execute(query)
        users = []
        
        for row in result:
            # Calculate 7-day trend for user
            trend = await self._calculate_7d_trend_for_user(client_id, row.user_id, target_date)
            
            users.append({
                'user_id': str(row.user_id),
                'name': row.name,
                'department': row.department,
                'avg_daily_interactions': int(row.avg_daily_interactions or 0),
                'delta_7d_pct': trend
            })
        
        return users
    
    async def get_user_engagement_from_table(self, client_id: str, target_date: date, department: str = None) -> List[Dict[str, Any]]:
        """Get user engagement data from UserEngagement table (kept for historical/user-specific analytics)"""
        
        conditions = [
            UserEngagement.client_id == client_id,
            UserEngagement.date == target_date
        ]
        
        if department:
            conditions.append(UserEngagement.department == department)
        
        query = select(UserEngagement).where(and_(*conditions))
        result = await self.session.execute(query)
        users = result.scalars().all()
        
        return [
            {
                'user_id': str(user.user_id),
                'name': user.name,
                'department': user.department,
                'avg_daily_interactions': user.avg_daily_interactions,
                'delta_7d_pct': float(user.delta_7d_pct)
            }
            for user in users
        ]
    
    async def get_agent_engagement_from_table(self, client_id: str, target_date: date) -> List[Dict[str, Any]]:
        """Get agent engagement data from AgentEngagement table (kept for actual agent deployments)"""
        
        query = select(AgentEngagement).where(
            and_(
                AgentEngagement.client_id == client_id,
                AgentEngagement.date == target_date
            )
        )
        result = await self.session.execute(query)
        agents = result.scalars().all()
        
        return [
            {
                'agent': agent.agent,
                'vendor': agent.vendor,
                'icon': agent.icon or "bot",
                'deployed': agent.deployed,
                'avg_prompts_per_day': agent.avg_prompts_per_day,
                'flagged_actions': agent.flagged_actions,
                'trend_pct_7d': float(agent.trend_pct_7d),
                'status': agent.status,
                'last_activity_iso': agent.last_activity_iso or "",
                'associated_apps': agent.associated_apps or []
            }
            for agent in agents
        ]
    
    async def get_productivity_correlations_from_table(self, client_id: str, target_date: date) -> Dict[str, Any]:
        """Get productivity correlations from ProductivityCorrelation table (kept for external metrics)"""
        
        query = select(ProductivityCorrelation).where(
            and_(
                ProductivityCorrelation.client_id == client_id,
                ProductivityCorrelation.date == target_date
            )
        )
        result = await self.session.execute(query)
        correlations = result.scalars().all()
        
        return {
            prod.department: {
                'ai_interactions_7d': prod.ai_interactions_7d,
                'output_metric_7d': prod.output_metric_7d,
                'note': prod.note or ""
            }
            for prod in correlations
        }
    
    async def get_engagement_summary(self, client_id: str, target_date: date, department: str = None) -> Dict[str, Any]:
        """Get comprehensive engagement summary using hybrid approach"""
        
        # Get runtime-calculated data (departments and applications)
        departments = await self.get_department_engagement(client_id, target_date, department)
        applications = await self.get_application_engagement(client_id, target_date, department)
        
        # Get data from kept tables (users, agents, productivity)
        users_runtime = await self.get_user_engagement(client_id, target_date, department)
        users_table = await self.get_user_engagement_from_table(client_id, target_date, department)
        agents = await self.get_agent_engagement_from_table(client_id, target_date)
        productivity_correlations = await self.get_productivity_correlations_from_table(client_id, target_date)
        
        # Calculate totals
        total_interactions = sum(dept['interactions'] for dept in departments)
        total_active_users = sum(dept['active_users'] for dept in departments)
        total_applications = len(applications)
        
        return {
            'date': target_date.isoformat(),
            'department': department,
            'summary': {
                'total_interactions': total_interactions,
                'total_active_users': total_active_users,
                'total_applications': total_applications,
                'total_departments': len(departments),
                'total_agents': len(agents),
                'total_users_runtime': len(users_runtime),
                'total_users_table': len(users_table)
            },
            'departments': departments,
            'applications': applications,
            'users_runtime': users_runtime,
            'users_table': users_table,
            'agents': agents,
            'productivity_correlations': productivity_correlations
        }
    
    async def _calculate_7d_trend(self, client_id: str, department: str, target_date: date) -> float:
        """Calculate 7-day trend percentage for department"""
        # Current period (last 7 days)
        current_start = target_date - timedelta(days=6)
        current_query = select(func.avg(ClientAIServiceUsage.daily_interactions)).where(
            and_(
                ClientAIServiceUsage.client_id == client_id,
                ClientAIServiceUsage.department == department,
                ClientAIServiceUsage.created_at >= current_start,
                ClientAIServiceUsage.created_at < target_date + timedelta(days=1)
            )
        )
        current_result = await self.session.execute(current_query)
        current_avg = current_result.scalar() or 0
        
        # Previous period (7 days before that)
        prev_start = target_date - timedelta(days=13)
        prev_end = target_date - timedelta(days=6)
        prev_query = select(func.avg(ClientAIServiceUsage.daily_interactions)).where(
            and_(
                ClientAIServiceUsage.client_id == client_id,
                ClientAIServiceUsage.department == department,
                ClientAIServiceUsage.created_at >= prev_start,
                ClientAIServiceUsage.created_at < prev_end
            )
        )
        prev_result = await self.session.execute(prev_query)
        prev_avg = prev_result.scalar() or 0
        
        if prev_avg == 0:
            return 0.0
        
        return round(((current_avg - prev_avg) / prev_avg) * 100, 2)
    
    async def _calculate_7d_trend_for_service(self, client_id: str, ai_service_id: str, target_date: date) -> float:
        """Calculate 7-day trend percentage for AI service"""
        # Similar logic as department trend but for specific service
        current_start = target_date - timedelta(days=6)
        current_query = select(func.avg(ClientAIServiceUsage.daily_interactions)).where(
            and_(
                ClientAIServiceUsage.client_id == client_id,
                ClientAIServiceUsage.ai_service_id == ai_service_id,
                ClientAIServiceUsage.created_at >= current_start,
                ClientAIServiceUsage.created_at < target_date + timedelta(days=1)
            )
        )
        current_result = await self.session.execute(current_query)
        current_avg = current_result.scalar() or 0
        
        prev_start = target_date - timedelta(days=13)
        prev_end = target_date - timedelta(days=6)
        prev_query = select(func.avg(ClientAIServiceUsage.daily_interactions)).where(
            and_(
                ClientAIServiceUsage.client_id == client_id,
                ClientAIServiceUsage.ai_service_id == ai_service_id,
                ClientAIServiceUsage.created_at >= prev_start,
                ClientAIServiceUsage.created_at < prev_end
            )
        )
        prev_result = await self.session.execute(prev_query)
        prev_avg = prev_result.scalar() or 0
        
        if prev_avg == 0:
            return 0.0
        
        return round(((current_avg - prev_avg) / prev_avg) * 100, 2)
    
    async def _calculate_7d_trend_for_user(self, client_id: str, user_id: str, target_date: date) -> float:
        """Calculate 7-day trend percentage for user"""
        # Similar logic as department trend but for specific user
        current_start = target_date - timedelta(days=6)
        current_query = select(func.avg(ClientAIServiceUsage.daily_interactions)).where(
            and_(
                ClientAIServiceUsage.client_id == client_id,
                ClientAIServiceUsage.user_id == user_id,
                ClientAIServiceUsage.created_at >= current_start,
                ClientAIServiceUsage.created_at < target_date + timedelta(days=1)
            )
        )
        current_result = await self.session.execute(current_query)
        current_avg = current_result.scalar() or 0
        
        prev_start = target_date - timedelta(days=13)
        prev_end = target_date - timedelta(days=6)
        prev_query = select(func.avg(ClientAIServiceUsage.daily_interactions)).where(
            and_(
                ClientAIServiceUsage.client_id == client_id,
                ClientAIServiceUsage.user_id == user_id,
                ClientAIServiceUsage.created_at >= prev_start,
                ClientAIServiceUsage.created_at < prev_end
            )
        )
        prev_result = await self.session.execute(prev_query)
        prev_avg = prev_result.scalar() or 0
        
        if prev_avg == 0:
            return 0.0
        
        return round(((current_avg - prev_avg) / prev_avg) * 100, 2)
    
    def _calculate_utilization(self, interactions: int) -> str:
        """Calculate utilization level based on interactions"""
        if interactions >= 100:
            return 'High'
        elif interactions >= 50:
            return 'Medium'
        else:
            return 'Low'
    
    def _get_utilization_recommendation(self, utilization: str) -> str:
        """Get recommendation based on utilization level"""
        if utilization == 'High':
            return 'Consider scaling up resources or optimizing usage patterns'
        elif utilization == 'Low':
            return 'Consider training users or evaluating necessity'
        else:
            return 'Monitor for changes in usage patterns'
