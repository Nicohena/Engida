"""Embeddings module"""
from app.embeddings.embedding_service import EmbeddingService
from app.embeddings.similarity import cosine_similarity, euclidean_distance, find_most_similar

__all__ = [
    "EmbeddingService",
    "cosine_similarity",
    "euclidean_distance",
    "find_most_similar",
]
