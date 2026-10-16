"""Application configuration"""
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings and configuration"""
    
    # Application
    APP_NAME: str = "ENGIDA AI Service"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Future: Database, Redis, S3, etc. configurations will go here
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
