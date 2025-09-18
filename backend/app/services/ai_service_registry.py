

from typing import Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession


class AIServiceRegistry:

    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_approved_services(self, client_id: Optional[str] = None) -> List[Dict]:

        


        return [
            {
                "id": "ai-1",
                "name": "ChatGPT",
                "domain_patterns": ["*.openai.com", "chat.openai.com"],
                "category": "chat",
                "risk_level": "medium",
                "approval_status": "approved",
                "conditions": {
                    "departments": ["Engineering", "Marketing"],
                    "time_restrictions": {"start": "09:00", "end": "17:00"},
                },
            },
            {
                "id": "ai-2", 
                "name": "GitHub Copilot",
                "domain_patterns": ["github.com"],
                "category": "coding",
                "risk_level": "low",
                "approval_status": "approved",
                "conditions": {
                    "departments": ["Engineering"],
                    "data_restrictions": ["no_phi", "no_pii"],
                },
            },
        ]
    
    async def is_service_approved(
        self,
        service_name: str,
        client_id: Optional[str] = None,
    ) -> bool:

        
        approved_services = await self.get_approved_services(client_id)
        return any(
            service["name"].lower() == service_name.lower()
            for service in approved_services
        )
    
    async def get_service_restrictions(
        self,
        service_name: str,
        client_id: Optional[str] = None,
    ) -> Optional[Dict]:

        
        approved_services = await self.get_approved_services(client_id)
        for service in approved_services:
            if service["name"].lower() == service_name.lower():
                return service.get("conditions", {})
        
        return None
