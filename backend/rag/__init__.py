"""NirogPath Medical RAG (Retrieval-Augmented Generation) Module.

Provides:
- Clinical Guidelines Knowledge Base
- Dense & Sparse Hybrid Vector Retriever
- LLM Provider Client (Gemini / OpenAI / OpenAI-compatible / Local Synthesis)
- End-to-end Doctor & Specialty Recommender Pipeline
"""

from .knowledge_base import CLINICAL_GUIDELINES_KB, ClinicalDocument, get_clinical_guidelines
from .retriever import RAGRetriever, RetrievalResult
from .generator import RAGGenerator, generate_doctor_recommendation

__all__ = [
    "CLINICAL_GUIDELINES_KB",
    "ClinicalDocument",
    "get_clinical_guidelines",
    "RAGRetriever",
    "RetrievalResult",
    "RAGGenerator",
    "generate_doctor_recommendation",
]
