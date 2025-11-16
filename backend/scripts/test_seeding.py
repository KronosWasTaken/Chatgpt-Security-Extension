#!/usr/bin/env python3
"""
Test script to verify the mock data seeding worked correctly
"""

import asyncio
import sys
import os
from datetime import date

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.models import (
    MSP, User, Client, ClientAIServices, AIService, ClientMetrics, Alert,
    AgentEngagement, UserEngagement, ProductivityCorrelation, ClientPolicy,
    ClientComplianceReport, PortfolioValueReport, ComplianceFramework,
    DetectionPattern, ClientAIServiceUsage
)
from sqlalchemy import select, func

async def test_msp_data():
    """Test MSP data"""
    print(" Testing MSP data...")
    
    async for session in get_async_session():
        msp_query = select(func.count(MSP.id))
        result = await session.execute(msp_query)
        msp_count = result.scalar()
        
        if msp_count > 0:
            print(f"   Found {msp_count} MSP(s)")
            
            # Get first MSP details
            msp_detail_query = select(MSP).limit(1)
            result = await session.execute(msp_detail_query)
            msp = result.scalar_one()
            print(f"   MSP: {msp.name} ({msp.subscription_tier})")
            return True
        else:
            print("   No MSPs found")
            return False

async def test_user_data():
    """Test user data"""
    print(" Testing user data...")
    
    async for session in get_async_session():
        user_query = select(func.count(User.id))
        result = await session.execute(user_query)
        user_count = result.scalar()
        
        if user_count > 0:
            print(f"   Found {user_count} user(s)")
            
            # Get user roles
            roles_query = select(User.role, func.count(User.id)).group_by(User.role)
            result = await session.execute(roles_query)
            roles = result.all()
            
            for role, count in roles:
                print(f"   {role}: {count} user(s)")
            return True
        else:
            print("   No users found")
            return False

async def test_client_data():
    """Test client data"""
    print(" Testing client data...")
    
    async for session in get_async_session():
        client_query = select(func.count(Client.id))
        result = await session.execute(client_query)
        client_count = result.scalar()
        
        if client_count > 0:
            print(f"   Found {client_count} client(s)")
            
            # Get client details
            clients_query = select(Client).limit(3)
            result = await session.execute(clients_query)
            clients = result.scalars().all()
            
            for client in clients:
                print(f"   {client.name} ({client.industry}) - {client.employee_count} employees")
            return True
        else:
            print("   No clients found")
            return False

async def test_ai_services():
    """Test AI services data"""
    print(" Testing AI services...")
    
    async for session in get_async_session():
        service_query = select(func.count(AIService.id))
        result = await session.execute(service_query)
        service_count = result.scalar()
        
        if service_count > 0:
            print(f"   Found {service_count} AI service(s)")
            
            # Get service details
            services_query = select(AIService).limit(3)
            result = await session.execute(services_query)
            services = result.scalars().all()
            
            for service in services:
                print(f"   {service.name} by {service.vendor} ({service.category})")
            return True
        else:
            print("   No AI services found")
            return False

async def test_client_applications():
    """Test client AI applications"""
    print(" Testing client applications...")
    
    async for session in get_async_session():
        app_query = select(func.count(ClientAIServices.id))
        result = await session.execute(app_query)
        app_count = result.scalar()
        
        if app_count > 0:
            print(f"   Found {app_count} client application(s)")
            
            # Get application details
            apps_query = select(ClientAIServices).limit(3)
            result = await session.execute(apps_query)
            apps = result.scalars().all()
            
            for app in apps:
                print(f"   {app.name} ({app.vendor}) - {app.status}")
            return True
        else:
            print("   No client applications found")
            return False

async def test_usage_data():
    """Test usage data"""
    print(" Testing usage data...")
    
    async for session in get_async_session():
        usage_query = select(func.count(ClientAIServiceUsage.id))
        result = await session.execute(usage_query)
        usage_count = result.scalar()
        
        if usage_count > 0:
            print(f"   Found {usage_count} usage record(s)")
            
            # Get usage summary
            summary_query = select(
                func.sum(ClientAIServiceUsage.daily_interactions),
                func.avg(ClientAIServiceUsage.daily_interactions),
                func.count(func.distinct(ClientAIServiceUsage.department))
            )
            result = await session.execute(summary_query)
            total, avg, dept_count = result.first()
            
            print(f"   Total interactions: {total}")
            print(f"   Average daily interactions: {avg:.1f}")
            print(f"   Departments with usage: {dept_count}")
            return True
        else:
            print("   No usage data found")
            return False

async def test_compliance_data():
    """Test compliance frameworks and patterns"""
    print(" Testing compliance data...")
    
    async for session in get_async_session():
        # Test frameworks
        framework_query = select(func.count(ComplianceFramework.id))
        result = await session.execute(framework_query)
        framework_count = result.scalar()
        
        # Test patterns
        pattern_query = select(func.count(DetectionPattern.id))
        result = await session.execute(pattern_query)
        pattern_count = result.scalar()
        
        if framework_count > 0 and pattern_count > 0:
            print(f"   Found {framework_count} compliance framework(s)")
            print(f"   Found {pattern_count} detection pattern(s)")
            
            # Get framework details
            frameworks_query = select(ComplianceFramework).limit(3)
            result = await session.execute(frameworks_query)
            frameworks = result.scalars().all()
            
            for framework in frameworks:
                print(f"   {framework.name} v{framework.version}")
            return True
        else:
            print("   No compliance data found")
            return False

async def test_agent_engagement():
    """Test agent engagement data"""
    print(" Testing agent engagement...")
    
    async for session in get_async_session():
        agent_query = select(func.count(AgentEngagement.id))
        result = await session.execute(agent_query)
        agent_count = result.scalar()
        
        if agent_count > 0:
            print(f"   Found {agent_count} agent engagement record(s)")
            
            # Get agent details
            agents_query = select(AgentEngagement).limit(3)
            result = await session.execute(agents_query)
            agents = result.scalars().all()
            
            for agent in agents:
                print(f"   {agent.agent} ({agent.vendor}) - {agent.status}")
            return True
        else:
            print("   No agent engagement data found")
            return False

async def test_alerts():
    """Test alert data"""
    print(" Testing alerts...")
    
    async for session in get_async_session():
        alert_query = select(func.count(Alert.id))
        result = await session.execute(alert_query)
        alert_count = result.scalar()
        
        if alert_count > 0:
            print(f"   Found {alert_count} alert(s)")
            
            # Get alert details
            alerts_query = select(Alert).limit(3)
            result = await session.execute(alerts_query)
            alerts = result.scalars().all()
            
            for alert in alerts:
                print(f"   {alert.title} ({alert.severity}) - {alert.status}")
            return True
        else:
            print("   No alerts found")
            return False

async def main():
    """Main test function"""
    print(" Testing Mock Data Seeding")
    print("=" * 50)
    
    try:
        # Run all tests
        tests = [
            ("MSP Data", test_msp_data),
            ("User Data", test_user_data),
            ("Client Data", test_client_data),
            ("AI Services", test_ai_services),
            ("Client Applications", test_client_applications),
            ("Usage Data", test_usage_data),
            ("Compliance Data", test_compliance_data),
            ("Agent Engagement", test_agent_engagement),
            ("Alerts", test_alerts)
        ]
        
        results = []
        for test_name, test_func in tests:
            try:
                result = await test_func()
                results.append((test_name, result))
            except Exception as e:
                print(f"   Error testing {test_name}: {e}")
                results.append((test_name, False))
        
        print("\n" + "=" * 50)
        print(" Test Results Summary:")
        
        passed = 0
        total = len(results)
        
        for test_name, result in results:
            status = " PASS" if result else " FAIL"
            print(f"  {test_name}: {status}")
            if result:
                passed += 1
        
        print(f"\n Overall: {passed}/{total} tests passed")
        
        if passed == total:
            print("\n All tests passed! Mock data seeding was successful.")
            print(" The system is ready for testing and development.")
        else:
            print(f"\n {total - passed} test(s) failed. Check the output above for details.")
        
        return passed == total
        
    except Exception as e:
        print(f"\n Test failed with error: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)