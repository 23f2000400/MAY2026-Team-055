"""RAG Generation Engine for NirogPath AI Recommender.

Constructs augmented prompts with retrieved clinical evidence and doctor directory context,
invokes the LLM (or local grounded synthesis engine), validates output schema,
and synthesizes the final response.
"""

import json
import logging
from typing import Dict, Any, Optional

from .retriever import RetrievalResult
from .llm_client import global_llm_client

logger = logging.getLogger("nirogpath.rag.generator")


class RAGGenerator:
    """End-to-end Generator for Retrieval-Augmented Doctor Recommendations."""

    def __init__(self, llm_client=None):
        self.llm = llm_client or global_llm_client

    def _build_system_prompt(self) -> str:
        return (
            "You are NirogPath AI, an expert Medical Triage and Specialist Recommender Assistant.\n"
            "Your task is to recommend the single most suitable doctor for a patient based SOLELY on the provided:\n"
            "1. RETRIEVED CLINICAL GUIDELINES (medical evidence)\n"
            "2. RETRIEVED DOCTOR CANDIDATES (verified database doctors)\n\n"
            "RULES:\n"
            "- You MUST select a doctor strictly from the RETRIEVED DOCTOR CANDIDATES list.\n"
            "- You MUST return valid JSON matching this exact structure:\n"
            "{\n"
            '  "doctor_id": "<id of chosen doctor>",\n'
            '  "reasoning": "<1-2 sentence clinical explanation citing patient symptoms and doctor expertise/specialty/rating>",\n'
            '  "clinical_notes": "<actionable patient preparation tip>",\n'
            '  "urgency_level": "routine | priority | emergency"\n'
            "}"
        )

    def _build_user_prompt(self, query: str, preferred_city: str, retrieval_result: RetrievalResult) -> str:
        return (
            f"PATIENT SYMPTOMS & QUERY:\n\"{query}\"\n"
            f"PREFERRED LOCATION: {preferred_city}\n\n"
            f"RETRIEVED CONTEXT:\n{retrieval_result.context_text}\n\n"
            "Analyze the symptoms against the clinical guidelines and choose the best matching doctor candidate. Output JSON only."
        )

    async def generate(self, db, query: str, preferred_city: str, retrieval_result: RetrievalResult) -> Dict[str, Any]:
        """Generates grounded recommendation from retrieved evidence."""
        if not retrieval_result.is_medical:
            return {
                "error": "non_medical_query",
                "message": "Your query does not appear to be medical or health-related. Please describe your symptoms."
            }

        top_doc = retrieval_result.top_doctor
        if not top_doc:
            return {
                "error": "no_doctor_found",
                "message": "No available doctor found for recommendation."
            }

        # Attempt generation via configured LLM API
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(query, preferred_city, retrieval_result)
        llm_raw_response = self.llm.generate_completion(system_prompt, user_prompt)

        doctor_obj = top_doc
        reasoning = ""
        clinical_notes = "Please bring any prior medical records and current prescriptions to your consultation."
        urgency_level = retrieval_result.urgency_level

        if llm_raw_response:
            try:
                # Clean code blocks if present
                clean_json = llm_raw_response.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.startswith("```"):
                    clean_json = clean_json[3:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                
                parsed = json.loads(clean_json.strip())
                chosen_doc_id = parsed.get("doctor_id")
                
                # Verify doctor in candidate list or DB
                if chosen_doc_id:
                    matched = next((d for d in retrieval_result.retrieved_doctors if d.get("id") == chosen_doc_id), None)
                    if not matched:
                        db_doc = await db.users.find_one({"id": chosen_doc_id, "role": "doctor"}, {"_id": 0, "password_hash": 0})
                        if db_doc:
                            matched = db_doc
                    if matched:
                        doctor_obj = matched
                
                if parsed.get("reasoning"):
                    reasoning = parsed["reasoning"]
                if parsed.get("clinical_notes"):
                    clinical_notes = parsed["clinical_notes"]
                if parsed.get("urgency_level"):
                    urgency_level = parsed["urgency_level"]
            except Exception as e:
                logger.warning(f"Failed to parse LLM JSON response ({e}), using grounded template synthesis.")

        # Grounded Local RAG Synthesis fallback if reasoning wasn't produced by LLM
        if not reasoning:
            doc_name = doctor_obj.get("name", "Specialist")
            specialty = doctor_obj.get("specialty", retrieval_result.detected_specialty)
            rating = doctor_obj.get("rating", 4.9)
            hospital = doctor_obj.get("hospital", "NirogPath Clinic")
            reasoning = f"Recommended {doc_name} as they specialize in {specialty} with rating {rating}★."

        # Collect citations / RAG sources
        rag_sources = []
        for g in retrieval_result.retrieved_guidelines:
            rag_sources.append({
                "type": "clinical_guideline",
                "id": g.id,
                "title": g.title,
                "specialty": g.specialty
            })
        for d in retrieval_result.retrieved_doctors[:2]:
            rag_sources.append({
                "type": "doctor_profile",
                "id": d.get("id", ""),
                "name": d.get("name", ""),
                "specialty": d.get("specialty", "")
            })

        # Ensure doctor object has fee
        doctor_data = {**doctor_obj, "fee": doctor_obj.get("fee", 500)}

        return {
            "doctor": doctor_data,
            "reasoning": reasoning,
            "detected_specialty": retrieval_result.detected_specialty,
            "urgency_level": urgency_level,
            "clinical_notes": clinical_notes,
            "budget_warning": retrieval_result.budget_warning,
            "rag_sources": rag_sources,
            "rag_metrics": {
                **retrieval_result.metrics,
                "llm_provider": self.llm.get_active_provider(),
            }
        }


# Global singleton generator instance
global_rag_generator = RAGGenerator()


async def generate_doctor_recommendation(db, query: str, preferred_city: str = "Bengaluru") -> Dict[str, Any]:
    """Convenience entry point for running the complete RAG recommendation pipeline."""
    from .retriever import global_rag_retriever
    retrieval_res = await global_rag_retriever.retrieve(db, query, preferred_city)
    return await global_rag_generator.generate(db, query, preferred_city, retrieval_res)
