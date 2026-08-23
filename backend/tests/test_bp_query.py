import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from config import db
from rag.retriever import global_rag_retriever
from rag.generator import global_rag_generator


@pytest.mark.anyio
async def test_bloodpressure_variations():
    await db.seed_if_needed()
    queries = [
        "high bloodpressure",
        "bloodpressure",
        "high bp",
        "high blood pressure",
        "chest pain and high bloodpressure",
        "severe bloodpressure problem",
    ]
    for q in queries:
        assert global_rag_retriever.check_medical_relevance(q) is True, f"Failed relevance for: {q}"
        res = await global_rag_retriever.retrieve(db, q, "Bengaluru")
        assert res.is_medical is True
        assert res.detected_specialty == "Cardiologist", f"Expected Cardiologist for '{q}', got '{res.detected_specialty}'"
        assert res.top_doctor is not None
        assert res.top_doctor["specialty"] == "Cardiologist"
