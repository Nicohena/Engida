"""Security utilities and authentication"""
from fastapi import Security, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


security = HTTPBearer()


async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verify JWT token from backend service.
    
    TODO: Implement actual token verification with backend's JWT secret
    """
    token = credentials.credentials
    
    # For now, accept any token (to be implemented with actual verification)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    
    return token
