"""Custom exception classes"""


class AIServiceException(Exception):
    """Base exception for AI service"""
    pass


class ModelNotLoadedException(AIServiceException):
    """Raised when a required model is not loaded"""
    pass


class LLMProviderException(AIServiceException):
    """Raised when LLM provider encounters an error"""
    pass


class EmbeddingException(AIServiceException):
    """Raised when embedding generation fails"""
    pass


class PredictionException(AIServiceException):
    """Raised when prediction fails"""
    pass


class InvalidInputException(AIServiceException):
    """Raised when input validation fails"""
    pass
