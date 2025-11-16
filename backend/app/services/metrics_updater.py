import asyncio
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.models import Client, ClientMetrics
from app.services.metrics_calculator import MetricsCalculator
from sqlalchemy import select

class MetricsUpdater:
    """Service to update client metrics in the background"""
    
    async def update_all_client_metrics(self):
        """Update metrics for all clients"""
        async for session in get_async_session():
            try:
                # Get all clients
                clients_query = select(Client)
                clients_result = await session.execute(clients_query)
                clients = clients_result.scalars().all()
                
                calculator = MetricsCalculator(session)
                
                for client in clients:
                    await self._update_client_metrics(session, calculator, str(client.id))
                
                await session.commit()
                print(f" Updated metrics for {len(clients)} clients")
                
            except Exception as e:
                await session.rollback()
                print(f" Error updating metrics: {e}")
                raise
            finally:
                await session.close()
    
    async def _update_client_metrics(self, session: AsyncSession, calculator: MetricsCalculator, client_id: str):
        """Update metrics for a specific client"""
        try:
            # Calculate current metrics
            metrics = await calculator.calculate_client_metrics(client_id)
            
            # Check if metrics already exist for today
            existing_query = select(ClientMetrics).where(
                ClientMetrics.client_id == client_id,
                ClientMetrics.date == date.today()
            )
            existing_result = await session.execute(existing_query)
            existing_metrics = existing_result.scalar_one_or_none()
            
            if existing_metrics:
                # Update existing metrics
                existing_metrics.apps_monitored = metrics["apps_monitored"]
                existing_metrics.interactions_monitored = metrics["interactions_monitored"]
                existing_metrics.agents_deployed = metrics["agents_deployed"]
                existing_metrics.risk_score = metrics["risk_score"]
                existing_metrics.compliance_coverage = metrics["compliance_coverage"]
            else:
                # Create new metrics record
                new_metrics = ClientMetrics(
                    client_id=client_id,
                    date=date.today(),
                    apps_monitored=metrics["apps_monitored"],
                    interactions_monitored=metrics["interactions_monitored"],
                    agents_deployed=metrics["agents_deployed"],
                    risk_score=metrics["risk_score"],
                    compliance_coverage=metrics["compliance_coverage"]
                )
                session.add(new_metrics)
            
        except Exception as e:
            print(f" Error updating metrics for client {client_id}: {e}")
            raise

# Background task function
async def update_metrics_task():
    """Background task to update metrics periodically"""
    updater = MetricsUpdater()
    await updater.update_all_client_metrics()

# Function to run metrics update manually
async def run_metrics_update():
    """Run metrics update manually"""
    updater = MetricsUpdater()
    await updater.update_all_client_metrics()
