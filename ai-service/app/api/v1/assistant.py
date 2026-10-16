"""AI Assistant API endpoints"""
from fastapi import APIRouter
from app.schemas.assistant import AssistantRequest, AssistantResponse

router = APIRouter()


@router.post("/chat", response_model=AssistantResponse)
async def chat_with_assistant(request: AssistantRequest):
    """
    Conversational AI assistant for property inquiries and guidance.
    """
    # TODO: Implement LLM-powered assistant
    return AssistantResponse(
        message="AI assistant response placeholder",
        context={},
    )
