"""
Seed initial data for the AI Compliance Platform.
"""

import asyncio
import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import async_engine
from app.models.shared import AIService, ComplianceFramework, DetectionPattern
from app.models.msp import MSP, MSPUser, Client
from app.models.client import ClientUser, ClientPolicy

logger = logging.getLogger(__name__)


async def seed_shared_data():
    """Seed shared reference data."""
    
    async with async_engine.begin() as conn:
        # Create shared schema if not exists
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS shared"))
        
        # Seed AI services
        ai_services = [
            {
                "name": "ChatGPT",
                "domain_patterns": ["*.openai.com", "chat.openai.com"],
                "category": "chat",
                "risk_level": "medium",
                "detection_patterns": {"keywords": ["chatgpt", "openai"]},
                "metadata": {"version": "4.0", "api_available": True},
                "is_active": True,
            },
            {
                "name": "Claude",
                "domain_patterns": ["claude.ai", "*.anthropic.com"],
                "category": "chat",
                "risk_level": "medium",
                "detection_patterns": {"keywords": ["claude", "anthropic"]},
                "metadata": {"version": "3.0", "api_available": True},
                "is_active": True,
            },
            {
                "name": "GitHub Copilot",
                "domain_patterns": ["github.com"],
                "category": "coding",
                "risk_level": "low",
                "detection_patterns": {"keywords": ["copilot", "github"]},
                "metadata": {"version": "2.0", "api_available": True},
                "is_active": True,
            },
        ]
        
        for service_data in ai_services:
            await conn.execute(
                """
                INSERT INTO shared.ai_services (name, domain_patterns, category, risk_level, detection_patterns, metadata, is_active)
                VALUES (:name, :domain_patterns, :category, :risk_level, :detection_patterns, :metadata, :is_active)
                ON CONFLICT (name) DO NOTHING
                """,
                service_data
            )
        
        # Seed compliance frameworks
        frameworks = [
            {
                "name": "HIPAA",
                "description": "Health Insurance Portability and Accountability Act",
                "version": "1.0",
                "regulations": {"phi_protection": True, "breach_notification": True},
                "requirements": {"encryption": True, "access_controls": True},
                "applicable_industries": ["Healthcare", "Medical"],
                "is_active": True,
            },
            {
                "name": "SOC2",
                "description": "Service Organization Control 2",
                "version": "2.0",
                "regulations": {"security": True, "availability": True, "processing_integrity": True},
                "requirements": {"access_controls": True, "monitoring": True},
                "applicable_industries": ["Technology", "SaaS", "Cloud"],
                "is_active": True,
            },
            {
                "name": "GDPR",
                "description": "General Data Protection Regulation",
                "version": "1.0",
                "regulations": {"data_protection": True, "privacy_by_design": True},
                "requirements": {"consent_management": True, "data_portability": True},
                "applicable_industries": ["All"],
                "is_active": True,
            },
        ]
        
        for framework_data in frameworks:
            await conn.execute(
                """
                INSERT INTO shared.compliance_frameworks (name, description, version, regulations, requirements, applicable_industries, is_active)
                VALUES (:name, :description, :version, :regulations, :requirements, :applicable_industries, :is_active)
                ON CONFLICT (name) DO NOTHING
                """,
                framework_data
            )
        
        # Seed detection patterns
        patterns = [
            {
                "framework_id": "(SELECT id FROM shared.compliance_frameworks WHERE name = 'HIPAA')",
                "pattern_type": "regex",
                "pattern_name": "SSN",
                "description": "Social Security Number detection",
                "pattern_data": {"pattern": r"\b\d{3}-?\d{2}-?\d{4}\b", "flags": "i"},
                "severity": "critical",
                "confidence_threshold": 0.95,
                "is_active": True,
            },
            {
                "framework_id": "(SELECT id FROM shared.compliance_frameworks WHERE name = 'HIPAA')",
                "pattern_type": "regex",
                "pattern_name": "Phone",
                "description": "Phone number detection",
                "pattern_data": {"pattern": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", "flags": "i"},
                "severity": "medium",
                "confidence_threshold": 0.85,
                "is_active": True,
            },
            {
                "framework_id": "(SELECT id FROM shared.compliance_frameworks WHERE name = 'Financial')",
                "pattern_type": "regex",
                "pattern_name": "Credit Card",
                "description": "Credit card number detection",
                "pattern_data": {"pattern": r"\b(?:\d{4}[-\s]?){3}\d{4}\b", "flags": "i"},
                "severity": "critical",
                "confidence_threshold": 0.95,
                "is_active": True,
            },
        ]
        
        for pattern_data in patterns:
            await conn.execute(
                """
                INSERT INTO shared.detection_patterns (framework_id, pattern_type, pattern_name, description, pattern_data, severity, confidence_threshold, is_active)
                VALUES ({}, :pattern_type, :pattern_name, :description, :pattern_data, :severity, :confidence_threshold, :is_active)
                ON CONFLICT DO NOTHING
                """.format(pattern_data["framework_id"]),
                {k: v for k, v in pattern_data.items() if k != "framework_id"}
            )


async def seed_msp_data():
    """Seed MSP and client data."""
    
    async with async_engine.begin() as conn:
        # Create MSP schema if not exists
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS msp_1"))
        
        # Seed MSP
        await conn.execute(
            """
            INSERT INTO msp_1.msps (id, name, business_type, subscription_tier, billing_cycle, contact_info, settings, status)
            VALUES ('msp-123', 'TechCorp MSP Solutions', 'MSP', 'enterprise', 'annual', 
                    '{"address": "123 Tech St", "phone": "+1-555-0123", "email": "contact@techcorp.com"}',
                    '{"max_clients": 100, "features": ["audit_logs", "compliance_reports"]}',
                    'active')
            ON CONFLICT (id) DO NOTHING
            """
        )
        
        # Seed MSP user
        await conn.execute(
            """
            INSERT INTO msp_1.msp_users (id, msp_id, email, first_name, last_name, role, permissions, auth_provider_id, is_active)
            VALUES ('msp-user-1', 'msp-123', 'admin@techcorp.com', 'John', 'Smith', 'msp_admin', 
                    ARRAY['msp:read', 'msp:write', 'client:read', 'client:write', 'audit:read'],
                    'auth0|123456', true)
            ON CONFLICT (id) DO NOTHING
            """
        )
        
        # Seed clients
        await conn.execute(
            """
            INSERT INTO msp_1.clients (id, msp_id, name, industry, company_size, compliance_requirements, schema_name, contact_email, primary_contact_name, primary_contact_phone, status)
            VALUES ('client-1', 'msp-123', 'General Hospital System', 'Healthcare', 'large', 
                    ARRAY['HIPAA', 'SOC2'], 'msp_1_client_1', 'it@hospital.com', 'Dr. Sarah Johnson', '+1-555-0123', 'active')
            ON CONFLICT (id) DO NOTHING
            """
        )


async def seed_client_data():
    """Seed client-specific data."""
    
    async with async_engine.begin() as conn:
        # Create client schema if not exists
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS msp_1_client_1"))
        
        # Seed client user
        await conn.execute(
            """
            INSERT INTO msp_1_client_1.client_users (id, client_id, email, first_name, last_name, role, permissions, department, job_title, auth_provider_id, is_active)
            VALUES ('client-user-1', 'client-1', 'admin@hospital.com', 'Dr. Sarah', 'Johnson', 'client_admin',
                    ARRAY['client:read', 'client:write', 'user:read', 'user:write', 'policy:read', 'policy:write', 'audit:read'],
                    'Emergency Medicine', 'Emergency Physician', 'auth0|789012', true)
            ON CONFLICT (id) DO NOTHING
            """
        )
        
        # Seed client policy
        await conn.execute(
            """
            INSERT INTO msp_1_client_1.client_policies (id, client_id, name, description, framework_id, rules, enforcement_level, priority, status, effective_date)
            VALUES ('policy-1', 'client-1', 'HIPAA Compliance Policy', 'Policy for handling PHI data',
                    (SELECT id FROM shared.compliance_frameworks WHERE name = 'HIPAA'),
                    '{"phi_detection": true, "block_phi": true, "audit_all": true}',
                    'block', 100, 'active', CURRENT_DATE)
            ON CONFLICT (id) DO NOTHING
            """
        )


async def main():
    """Main seeding function."""
    
    logger.info("Starting data seeding...")
    
    try:
        await seed_shared_data()
        logger.info("Shared data seeded successfully")
        
        await seed_msp_data()
        logger.info("MSP data seeded successfully")
        
        await seed_client_data()
        logger.info("Client data seeded successfully")
        
        logger.info("Data seeding completed successfully")
        
    except Exception as e:
        logger.error(f"Data seeding failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
