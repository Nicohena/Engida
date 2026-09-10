"""LLM Provider configuration and management"""
from typing import Optional
from app.llm.client import LLMClient, BaseLLMClient
from app.core.config import settings
from app.core.logging import logger


class LLMProvider:
    """
    Manages LLM provider configuration and client instances.
    """
    
    _instance: Optional[BaseLLMClient] = None
    
    @classmethod
    def get_client(cls) -> BaseLLMClient:
        """Get or create LLM client instance (singleton)"""
        if cls._instance is None:
            # TODO: Get provider and API key from settings
            provider = "openai"  # Default provider
            api_key = "placeholder"  # TODO: Get from environment
            
            cls._instance = LLMClient.create(provider, api_key)
            logger.info(f"Initialized LLM provider: {provider}")
        
        return cls._instance
    
    @classmethod
    def set_provider(cls, provider: str, api_key: str):
        """Change LLM provider"""
        cls._instance = LLMClient.create(provider, api_key)
        logger.info(f"Switched to LLM provider: {provider}")
