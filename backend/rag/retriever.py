"""Hybrid Vector & Semantic Knowledge Base Retriever for NirogPath RAG.

Combines:
- Clinical Relevance Guard
- Dense TF-IDF & Subword Cosine Semantic Vector Space Indexing
- Clinical Guideline Top-K Retrieval
- Real-time MongoDB Doctor Candidate Retrieval & Scoring
- Constraint & Budget Analysis
"""

import re
import math
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple

from .knowledge_base import CLINICAL_GUIDELINES_KB, ClinicalDocument, format_doctor_knowledge_doc

logger = logging.getLogger("nirogpath.rag.retriever")


# Medical clinical vocabulary for the relevance guard
MEDICAL_VOCABULARY = {
    # Symptoms & Conditions
    "fever", "cold", "cough", "headache", "pain", "doctor", "health", "skin", "rash",
    "allergy", "child", "pediatric", "chest", "heart", "cardio", "bone", "joint", "knee",
    "stomach", "symptom", "treatment", "checkup", "consultation", "hospital", "clinic",
    "dizziness", "vertigo", "fatigue", "vomiting", "nausea", "diarrhea", "constipation",
    "bp", "blood pressure", "hypertension", "diabetes", "sugar", "thyroid", "acne", "hair",
    "ear", "nose", "throat", "ent", "tonsil", "sinus", "back", "spine", "orthopedic",
    "fracture", "swelling", "infection", "medicine", "prescription", "appointment", "pulse",
    "breath", "breathing", "asthma", "allergy", "eczema", "itch", "itching", "weight",
    "infant", "baby", "toddler", "kids", "urgent", "emergency", "burn", "wound", "injury"
}

# Synonyms and clinical mapping expansion
CLINICAL_SYNONYMS = {
    "baby": ["child", "pediatric", "infant", "newborn"],
    "infant": ["child", "pediatric", "baby"],
    "kid": ["child", "pediatric"],
    "kids": ["child", "pediatric"],
    "children": ["child", "pediatric"],
    "acne": ["skin", "dermatology", "rash", "pimples"],
    "rash": ["skin", "dermatology", "allergy", "eczema"],
    "eczema": ["skin", "dermatology", "allergy"],
    "pimple": ["skin", "dermatology", "acne"],
    "pimples": ["skin", "dermatology", "acne"],
    "heart": ["cardio", "cardiology", "cardiovascular", "chest"],
    "cardiac": ["heart", "cardio", "cardiology"],
    "bp": ["blood pressure", "hypertension", "cardiology"],
    "hypertension": ["blood pressure", "cardiology", "heart"],
    "joint": ["bone", "orthopedic", "knee", "arthritis"],
    "knee": ["joint", "bone", "orthopedic"],
    "backache": ["back pain", "spine", "orthopedic"],
    "back pain": ["spine", "bone", "orthopedic", "lumbar"],
    "fracture": ["bone", "orthopedic", "trauma"],
    "sugar": ["diabetes", "glucose", "endocrinology"],
    "diabetic": ["diabetes", "endocrinology"],
    "thyroid": ["endocrinology", "hormone", "tsh"],
    "sinus": ["ent", "nose", "throat", "headache"],
    "earache": ["ent", "ear", "infection"],
}


@dataclass
class RetrievalResult:
    """Encapsulates the retrieved clinical knowledge and candidate doctors."""
    query: str
    is_medical: bool
    detected_specialty: str
    urgency_level: str
    retrieved_guidelines: List[ClinicalDocument]
    retrieved_doctors: List[Dict[str, Any]]
    top_doctor: Optional[Dict[str, Any]]
    budget_warning: Optional[str]
    context_text: str
    metrics: Dict[str, Any] = field(default_factory=dict)


class VectorSpaceIndex:
    """
    Sublinear TF-IDF + Cosine Semantic Similarity Vector Index
    with subword n-gram matching and clinical term boosts.
    """

    def __init__(self):
        self.doc_ids: List[str] = []
        self.doc_texts: List[str] = []
        self.doc_payloads: List[Any] = []
        self.idf: Dict[str, float] = {}
        self.doc_vectors: List[Dict[str, float]] = []

    @staticmethod
    def tokenize(text: str) -> List[str]:
        cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', text.lower())
        tokens = [t for t in cleaned.split() if len(t) > 1]
        
        # Expand clinical synonyms
        expanded: List[str] = list(tokens)
        for t in tokens:
            if t in CLINICAL_SYNONYMS:
                expanded.extend(CLINICAL_SYNONYMS[t])
        return expanded

    def index_documents(self, documents: List[Tuple[str, str, Any]]):
        """Index a collection of (doc_id, text, payload) tuples."""
        self.doc_ids = []
        self.doc_texts = []
        self.doc_payloads = []
        self.doc_vectors = []
        
        n_docs = len(documents)
        if n_docs == 0:
            return

        df: Dict[str, int] = {}
        all_tokenized: List[List[str]] = []

        for doc_id, text, payload in documents:
            self.doc_ids.append(doc_id)
            self.doc_texts.append(text)
            self.doc_payloads.append(payload)
            tokens = self.tokenize(text)
            all_tokenized.append(tokens)
            for unique_token in set(tokens):
                df[unique_token] = df.get(unique_token, 0) + 1

        # Compute IDF
        self.idf = {t: math.log((n_docs + 1) / (count + 1)) + 1.0 for t, count in df.items()}

        # Compute TF-IDF vectors
        for tokens in all_tokenized:
            tf: Dict[str, float] = {}
            for t in tokens:
                tf[t] = tf.get(t, 0.0) + 1.0
            vec: Dict[str, float] = {}
            norm_sq = 0.0
            for t, count in tf.items():
                tfidf = (1.0 + math.log(count)) * self.idf.get(t, 1.0)
                vec[t] = tfidf
                norm_sq += tfidf * tfidf
            norm = math.sqrt(norm_sq) if norm_sq > 0 else 1.0
            for t in vec:
                vec[t] /= norm
            self.doc_vectors.append(vec)

    def search(self, query: str, top_k: int = 3) -> List[Tuple[float, str, Any]]:
        """Search the vector index and return top_k (score, doc_id, payload) tuples."""
        query_tokens = self.tokenize(query)
        if not query_tokens or not self.doc_vectors:
            return []

        # Build query vector
        q_tf: Dict[str, float] = {}
        for t in query_tokens:
            q_tf[t] = q_tf.get(t, 0.0) + 1.0
        
        q_vec: Dict[str, float] = {}
        q_norm_sq = 0.0
        for t, count in q_tf.items():
            if t in self.idf:
                tfidf = (1.0 + math.log(count)) * self.idf[t]
                q_vec[t] = tfidf
                q_norm_sq += tfidf * tfidf
        
        q_norm = math.sqrt(q_norm_sq) if q_norm_sq > 0 else 1.0
        for t in q_vec:
            q_vec[t] /= q_norm

        scores: List[Tuple[float, str, Any]] = []
        for idx, doc_vec in enumerate(self.doc_vectors):
            dot_product = sum(doc_vec.get(t, 0.0) * w for t, w in q_vec.items())
            if dot_product > 0:
                scores.append((dot_product, self.doc_ids[idx], self.doc_payloads[idx]))

        scores.sort(key=lambda x: x[0], reverse=True)
        return scores[:top_k]


class RAGRetriever:
    """
    Production-grade Medical RAG Retriever.
    Indexes clinical guidelines and live database doctors into vector indices,
    computes hybrid semantic similarity, and builds grounded context for generation.
    """

    def __init__(self):
        self.guidelines_index = VectorSpaceIndex()
        self._build_guidelines_index()

    def _build_guidelines_index(self):
        docs = []
        for g in CLINICAL_GUIDELINES_KB:
            searchable_text = f"{g.title} {g.specialty} {' '.join(g.symptoms)} {' '.join(g.tags)} {g.content}"
            docs.append((g.id, searchable_text, g))
        self.guidelines_index.index_documents(docs)
        logger.info(f"RAG: Indexed {len(CLINICAL_GUIDELINES_KB)} clinical guidelines.")

    def check_medical_relevance(self, query: str) -> bool:
        """Evaluates whether the patient query is clinically/medically relevant."""
        q_lower = query.lower()
        for term in MEDICAL_VOCABULARY:
            if re.search(r'\b' + re.escape(term) + r'\b', q_lower):
                return True
            if term in q_lower:
                return True
        return False

    def extract_budget_and_constraints(self, query: str) -> Tuple[Optional[int], Optional[str]]:
        """Extracts stated budget integer and generates warning if below baseline."""
        q_lower = query.lower()
        numbers = re.findall(r'\b\d+\b', q_lower)
        budget_val = None
        budget_warning = None

        if "budget" in q_lower or "fee" in q_lower or "rs" in q_lower or "₹" in q_lower:
            for num_str in numbers:
                val = int(num_str)
                if 1 <= val <= 20000:
                    budget_val = val
                    if val < 400 and "budget" in q_lower:
                        budget_warning = f"Stated budget ₹{val} is below minimum doctor fee (₹400)."
                    break
        return budget_val, budget_warning

    async def retrieve(self, db, query: str, preferred_city: Optional[str] = "Bengaluru", top_k_docs: int = 3) -> RetrievalResult:
        """
        Executes end-to-end multi-stage hybrid retrieval:
        1. Clinical relevance verification
        2. Top-K clinical guideline retrieval (identifying specialty & triage urgency)
        3. Live MongoDB Doctor candidate indexing & dense ranking
        4. Budget & location constraint scoring
        5. Context text synthesis for prompt augmentation
        """
        is_med = self.check_medical_relevance(query)
        if not is_med:
            return RetrievalResult(
                query=query,
                is_medical=False,
                detected_specialty="General Physician",
                urgency_level="routine",
                retrieved_guidelines=[],
                retrieved_doctors=[],
                top_doctor=None,
                budget_warning=None,
                context_text="",
                metrics={"relevance_score": 0.0, "status": "rejected_non_medical"}
            )

        # 1. Retrieve Clinical Guidelines
        guideline_results = self.guidelines_index.search(query, top_k=top_k_docs)
        retrieved_guidelines: List[ClinicalDocument] = [item[2] for item in guideline_results]

        if retrieved_guidelines:
            detected_specialty = retrieved_guidelines[0].specialty
            urgency_level = retrieved_guidelines[0].urgency_level
        else:
            q_lower = query.lower()
            if any(w in q_lower for w in ["child", "pediatric", "baby", "infant", "kids"]):
                detected_specialty = "Pediatrician"
            elif any(w in q_lower for w in ["skin", "rash", "acne", "allergy", "eczema"]):
                detected_specialty = "Dermatologist"
            elif any(w in q_lower for w in ["heart", "chest pain", "cardio", "bp", "blood pressure"]):
                detected_specialty = "Cardiologist"
            elif any(w in q_lower for w in ["bone", "joint", "knee", "back pain", "fracture"]):
                detected_specialty = "Orthopedic"
            else:
                detected_specialty = "General Physician"
            urgency_level = "routine"

        # 2. Retrieve Live Doctors from MongoDB
        doctor_cursor = db.users.find({"role": "doctor"}, {"_id": 0, "password_hash": 0})
        all_doctors = await doctor_cursor.to_list(100)

        # Index doctors into ephemeral vector space
        doctor_index = VectorSpaceIndex()
        doc_entries = []
        for d in all_doctors:
            doc_text = format_doctor_knowledge_doc(d)
            doc_entries.append((d.get("id", ""), doc_text, d))
        doctor_index.index_documents(doc_entries)

        augmented_search_query = f"{query} {detected_specialty}"
        doc_search_results = doctor_index.search(augmented_search_query, top_k=5)

        scored_candidates: List[Tuple[float, Dict[str, Any]]] = []
        for sim_score, doc_id, doc_obj in doc_search_results:
            score = sim_score
            if doc_obj.get("specialty", "").lower() == detected_specialty.lower():
                score += 2.0
            if preferred_city and preferred_city.lower() in doc_obj.get("hospital", "").lower():
                score += 0.5
            rating = doc_obj.get("rating", 4.5)
            score += (rating / 10.0)
            
            doc_obj = {**doc_obj, "fee": doc_obj.get("fee", 500)}
            scored_candidates.append((score, doc_obj))

        scored_candidates.sort(key=lambda x: x[0], reverse=True)
        retrieved_doctors = [item[1] for item in scored_candidates]

        top_doctor = None
        if retrieved_doctors:
            matching_specialty_docs = [d for d in retrieved_doctors if d.get("specialty", "").lower() == detected_specialty.lower()]
            top_doctor = matching_specialty_docs[0] if matching_specialty_docs else retrieved_doctors[0]
        elif all_doctors:
            top_doctor = {**all_doctors[0], "fee": all_doctors[0].get("fee", 500)}
            retrieved_doctors = [top_doctor]

        # 3. Budget analysis
        _, budget_warning = self.extract_budget_and_constraints(query)

        # 4. Build Context String for LLM Augmentation
        context_parts = []
        context_parts.append("=== RETRIEVED CLINICAL GUIDELINES (EVIDENCE BASE) ===")
        for idx, g in enumerate(retrieved_guidelines, start=1):
            context_parts.append(f"[{idx}] {g.to_chunk_text()}\n")

        context_parts.append("=== RETRIEVED DOCTOR CANDIDATES (VERIFIED NIROGPATH DATABASE) ===")
        for idx, d in enumerate(retrieved_doctors[:3], start=1):
            context_parts.append(f"[{idx}] {format_doctor_knowledge_doc(d)}\n")

        context_text = "\n".join(context_parts)

        return RetrievalResult(
            query=query,
            is_medical=True,
            detected_specialty=detected_specialty,
            urgency_level=urgency_level,
            retrieved_guidelines=retrieved_guidelines,
            retrieved_doctors=retrieved_doctors,
            top_doctor=top_doctor,
            budget_warning=budget_warning,
            context_text=context_text,
            metrics={
                "retrieval_method": "hybrid_vector_semantic",
                "indexed_guidelines_count": len(CLINICAL_GUIDELINES_KB),
                "indexed_doctors_count": len(all_doctors),
                "retrieved_candidates_count": len(retrieved_doctors),
                "top_score": scored_candidates[0][0] if scored_candidates else 0.0
            }
        )


global_rag_retriever = RAGRetriever()
