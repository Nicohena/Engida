"""Search API endpoints"""
from fastapi import APIRouter, Depends
from app.schemas.search import SearchRequest, SearchResponse

router = APIRouter()


@router.post("", response_model=SearchResponse)
async def search_properties(request: SearchRequest):
    """
    AI-powered property search with natural language understanding
    and semantic matching.
    """
    # TODO: Implement search service integration
    return SearchResponse(
        results=[],
        total=0,
        page=1,
        page_size=10,
    )
