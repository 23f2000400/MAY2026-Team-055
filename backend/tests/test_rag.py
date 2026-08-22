"""Unit and integration test suite for NirogPath Medical RAG Pipeline."""
import pytest
import asyncio
from config import db
from rag.retriever import global_rag_retriever
from rag.generator import global_rag_generator
from rag.knowledge_base import CLINICAL_GUIDELINES_KB


@pytest.mark.anyio
async def test_rag_knowledge_base_loaded():
    """Verify that clinical guidelines corpus is properly structured and loaded."""
    assert len(CLINICAL_GUIDELINES_KB) >= 8
    for doc in CLINICAL_GUIDELINES_KB:
        assert doc.id.startswith("CG-")
        assert doc.specialty
        assert doc.content
        assert len(doc.symptoms) > 0


@pytest.mark.anyio
async def test_rag_relevance_guard():
    """Verify that clinical relevance guard distinguishes medical vs non-medical queries."""
    # Non-medical queries
    assert not global_rag_retriever.check_medical_relevance("who is this actor?")
    assert not global_rag_retriever.check_medical_relevance("what is the weather today?")
    assert not global_rag_retriever.check_medical_relevance("tell me a python programming tutorial")

    # Medical queries
    assert global_rag_retriever.check_medical_relevance("child fever and cold")
    assert global_rag_retriever.check_medical_relevance("skin rash and itchy acne")
    assert global_rag_retriever.check_medical_relevance("severe chest pain and palpitations")


@pytest.mark.anyio
async def test_rag_retrieval_and_doctor_matching():
    """Verify end-to-end RAG retrieval matches proper specialty & candidate doctors."""
    await db.seed_if_needed()

    test_cases = [
        ("child cough and pediatric rash", "Pediatrician"),
        ("skin allergy with severe itchy acne", "Dermatologist"),
        ("chest heaviness with high blood pressure", "Cardiologist"),
        ("severe knee joint pain and lower back ache", "Orthopedic"),
        ("viral fever and cold with mild fatigue", "General Physician"),
    ]

    for query, expected_specialty in test_cases:
        res = await global_rag_retriever.retrieve(db, query, "Bengaluru")
        assert res.is_medical is True
        assert res.detected_specialty == expected_specialty
        assert res.top_doctor is not None
        assert len(res.retrieved_guidelines) > 0

        # Run generator
        out = await global_rag_generator.generate(db, query, "Bengaluru", res)
        assert out["doctor"] is not None
        assert "fee" in out["doctor"]
        assert out["reasoning"]
        assert out["detected_specialty"] == expected_specialty
        assert len(out["rag_sources"]) > 0


@pytest.mark.anyio
async def test_rag_budget_constraint_warning():
    """Verify budget extraction and warning generation."""
    _, warning = global_rag_retriever.extract_budget_and_constraints("fever and cold with budget 250")
    assert warning is not None
    assert "below minimum doctor fee" in warning.lower()
