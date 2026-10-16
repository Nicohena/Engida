"""Client for ENGIDA backend API"""
from typing import Dict, Any, Optional, List
import httpx
from app.core.config import settings
from app.core.logging import logger


class EngidaBackendClient:
    """
    HTTP client for communicating with ENGIDA NestJS backend.
    """
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or "http://localhost:3000"
        self.logger = logger
        self.client = httpx.AsyncClient(base_url=self.base_url)
    
    async def get_property(self, property_id: str) -> Optional[Dict[str, Any]]:
        """Fetch property data from backend"""
        try:
            response = await self.client.get(f"/properties/{property_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            self.logger.error(f"Error fetching property: {e}")
            return None
    
    async def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch user preferences from backend"""
        try:
            response = await self.client.get(f"/users/{user_id}/preferences")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            self.logger.error(f"Error fetching user preferences: {e}")
            return None
    
    async def get_user_history(
        self,
        user_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Fetch user interaction history"""
        try:
            response = await self.client.get(
                f"/users/{user_id}/history",
                params={"limit": limit}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            self.logger.error(f"Error fetching user history: {e}")
            return []
    
    async def search_properties(
        self,
        filters: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Search properties with filters"""
        try:
            response = await self.client.post("/properties/search", json=filters)
            response.raise_for_status()
            return response.json().get("data", [])
        except httpx.HTTPError as e:
            self.logger.error(f"Error searching properties: {e}")
            return []
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
