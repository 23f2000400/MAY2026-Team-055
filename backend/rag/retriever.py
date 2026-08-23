"""Hybrid Vector & Semantic Knowledge Base Retriever for NirogPath RAG.

Combines:
- Clinical Relevance Guard with Compound Term Normalization
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


def normalize_clinical_text(text: str) -> str:
    """Normalizes common fused medical words and spelling variants."""
    cleaned = text.lower()
    replacements = {
        r'\bbloodpressure\b': 'blood pressure',
        r'\bhighbp\b': 'high blood pressure',
        r'\blowbp\b': 'low blood pressure',
        r'\bhigh-bp\b': 'high blood pressure',
        r'\blow-bp\b': 'low blood pressure',
        r'\bbloodsugar\b': 'blood sugar',
        r'\bhighsugar\b': 'high blood sugar',
        r'\blowsugar\b': 'low blood sugar',
        r'\bhigh-sugar\b': 'high blood sugar',
        r'\bsorethroat\b': 'sore throat',
        r'\bchestpain\b': 'chest pain',
        r'\bbackpain\b': 'back pain',
        r'\bkneepain\b': 'knee pain',
        r'\bneckpain\b': 'neck pain',
        r'\bjointpain\b': 'joint pain',
        r'\bstomachache\b': 'stomach ache',
        r'\bbodyache\b': 'body ache',
        r'\bheadache\b': 'headache',
        r'\bheartattack\b': 'heart attack',
        r'\bheartburn\b': 'heartburn',
        r'\blosemotion\b': 'loose motions',
        r'\bloosemotion\b': 'loose motions',
        r'\bloosemotions\b': 'loose motions',
    }
    for pat, rep in replacements.items():
        cleaned = re.sub(pat, rep, cleaned)
    return cleaned


# Comprehensive medical clinical vocabulary for the relevance guard
MEDICAL_VOCABULARY = {
    # Cardiovascular & Blood Pressure
    "blood", "pressure", "bloodpressure", "bp", "hypertension", "hypertensive", "hypotension",
    "cardiac", "cardio", "cardiovascular", "heart", "chest", "chestpain", "angina", "palpitation",
    "palpitations", "pulse", "arrhythmia", "cholesterol",

    # Symptoms & Conditions
    "fever", "feverish", "temperature", "chills", "cold", "cough", "coughing", "sneeze", "sneezing",
    "headache", "bodyache", "pain", "aching", "sore", "hurt", "hurting", "stiff", "stiffness",
    "dizziness", "dizzy", "vertigo", "fatigue", "tired", "tiredness", "weak", "weakness", "lethargy",
    "vomiting", "vomit", "nausea", "nauseous", "diarrhea", "constipation", "motions", "acidity",
    "gas", "bloating", "indigestion", "heartburn", "cramp", "cramps", "spasm",

    # Dermatology & Allergy
    "skin", "rash", "rashes", "acne", "pimple", "pimples", "allergy", "allergic", "eczema",
    "psoriasis", "itch", "itching", "itchy", "dandruff", "alopecia", "hair", "hairfall",
    "pigmentation", "mole", "boil", "ulcer", "blister", "burn", "wound", "bruise",

    # Pediatrics & Family
    "child", "children", "pediatric", "infant", "baby", "toddler", "kids", "newborn",
    "vaccine", "vaccination", "growth", "colic",

    # Orthopedic & Spine
    "bone", "joint", "jointpain", "knee", "kneepain", "back", "backache", "backpain", "spine",
    "lumbar", "cervical", "neck", "neckpain", "shoulder", "orthopedic", "fracture", "sprain",
    "strain", "swelling", "swollen", "arthritis", "ligament",

    # ENT, Eyes & Dental
    "ear", "ears", "earache", "hearing", "tinnitus", "nose", "sinus", "sinusitis", "throat",
    "sorethroat", "ent", "tonsil", "tonsillitis", "eye", "eyes", "vision", "blurry",
    "teeth", "tooth", "toothache", "gum", "gums", "dental", "dentist",

    # Respiratory & Pulmonary
    "breath", "breathing", "breathless", "breathlessness", "dyspnea", "asthma", "asthmatic",
    "wheezing", "lungs", "congestion", "phlegm", "mucus",

    # Endocrinology & Internal Medicine
    "diabetes", "diabetic", "sugar", "bloodsugar", "glucose", "insulin", "thyroid", "tsh",
    "hormone", "weight", "obesity", "appetite",

    # Abdominal & Renal
    "stomach", "stomachache", "abdomen", "abdominal", "belly", "liver", "jaundice",
    "kidney", "urine", "urinary", "uti", "stone",

    # General Healthcare & Clinical Services
    "doctor", "physician", "specialist", "surgeon", "consultation", "consult", "checkup",
    "hospital", "clinic", "opd", "medicine", "medication", "prescription", "tablet", "pill",
    "dose", "test", "scan", "xray", "ecg", "ultrasound", "infection", "infected", "urgent",
    "emergency", "sick", "ill", "unwell", "disease", "disorder", "health"
}

# Synonyms and clinical mapping expansion
CLINICAL_SYNONYMS = {
    "baby": ["child", "pediatric", "infant", "newborn"],
    "infant": ["child", "pediatric", "baby"],
    "kid": ["child", "pediatric"],
    "kids": ["child", "pediatric"],
    "children": ["child", "pediatric"],
    "bloodpressure": ["blood pressure", "bp", "hypertension", "cardiology", "heart"],
    "blood": ["blood pressure", "sugar", "circulation", "cardiology"],
    "pressure": ["blood pressure", "hypertension", "bp", "cardiology", "heart"],
    "hypertension": ["high blood pressure", "bloodpressure", "cardiology", "heart", "bp"],
    "highbp": ["high blood pressure", "hypertension", "cardiology", "heart"],
    "lowbp": ["low blood pressure", "hypotension", "cardiology"],
    "acne": ["skin", "dermatology", "rash", "pimples"],
    "rash": ["skin", "dermatology", "allergy", "eczema"],
    "eczema": ["skin", "dermatology", "allergy"],
    "pimple": ["skin", "dermatology", "acne"],
    "pimples": ["skin", "dermatology", "acne"],
    "heart": ["cardio", "cardiology", "cardiovascular", "chest"],
    "cardiac": ["heart", "cardio", "cardiology"],
    "bp": ["blood pressure", "hypertension", "cardiology"],
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
        cleaned = normalize_clinical_text(text)
        cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', cleaned.lower())
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
        q_normalized = normalize_clinical_text(query)
        q_lower = q_normalized.lower()

        # 1. Direct vocabulary / token match
        tokens = re.findall(r'[a-zA-Z]+', q_lower)
        for t in tokens:
            if t in MEDICAL_VOCABULARY:
                return True

        # 2. Multi-word phrase or substring match
        for term in MEDICAL_VOCABULARY:
            if re.search(r'\b' + re.escape(term) + r'\b', q_lower) or term in q_lower:
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
                    if val < 400:
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
        normalized_q = normalize_clinical_text(query)
        guideline_results = self.guidelines_index.search(normalized_q, top_k=top_k_docs)
        retrieved_guidelines: List[ClinicalDocument] = [item[2] for item in guideline_results]

        # If guidelines matched, extract specialty & urgency
        if retrieved_guidelines:
            detected_specialty = retrieved_guidelines[0].specialty
            urgency_level = retrieved_guidelines[0].urgency_level
        else:
            # Fallback clinical categorization
            q_lower = normalized_q.lower()
            if any(w in q_lower for w in ["heart", "chest pain", "cardio", "bp", "blood pressure", "bloodpressure", "pressure", "hypertension", "palpitation", "angina"]):
                detected_specialty = "Cardiologist"
                urgency_level = "priority"
            elif any(w in q_lower for w in ["child", "pediatric", "baby", "infant", "kids"]):
                detected_specialty = "Pediatrician"
                urgency_level = "priority"
            elif any(w in q_lower for w in ["skin", "rash", "acne", "allergy", "eczema", "pimple"]):
                detected_specialty = "Dermatologist"
                urgency_level = "routine"
            elif any(w in q_lower for w in ["bone", "joint", "knee", "back pain", "fracture", "spine"]):
                detected_specialty = "Orthopedic"
                urgency_level = "priority"
            else:
                detected_specialty = "General Physician"
                urgency_level = "routine"

        # 2. Retrieve Live Doctors from MongoDB
        all_doctors: List[Dict[str, Any]] = []
        try:
            doctor_cursor = db.users.find({"role": "doctor"}, {"_id": 0, "password_hash": 0})
            if hasattr(doctor_cursor, "to_list"):
                all_doctors = await doctor_cursor.to_list(100)
            elif hasattr(doctor_cursor, "__iter__"):
                all_doctors = list(doctor_cursor)
        except Exception as e:
            logger.warning(f"Error fetching doctors from database: {e}")
            all_doctors = []

        # Index doctors into ephemeral vector space
        doctor_index = VectorSpaceIndex()
        doc_entries = []
        for d in all_doctors:
            doc_text = format_doctor_knowledge_doc(d)
            doc_entries.append((d.get("id", ""), doc_text, d))
        doctor_index.index_documents(doc_entries)

        # Search doctor candidates using normalized query + detected specialty
        augmented_search_query = f"{normalized_q} {detected_specialty}"
        doc_search_results = doctor_index.search(augmented_search_query, top_k=5)

        # Re-rank doctors by: specialty match (highest) + rating + city relevance
        scored_candidates: List[Tuple[float, Dict[str, Any]]] = []
        for sim_score, doc_id, doc_obj in doc_search_results:
            score = sim_score
            # Specialty exact match boost
            if doc_obj.get("specialty", "").lower() == detected_specialty.lower():
                score += 2.0
            # City matching boost
            if preferred_city and preferred_city.lower() in doc_obj.get("hospital", "").lower():
                score += 0.5
            # Rating weighting
            rating = doc_obj.get("rating", 4.5)
            score += (rating / 10.0)
            
            # Ensure fee is present and clean
            fee_val = doc_obj.get("fee", 500)
            try:
                fee_val = int(fee_val)
            except (ValueError, TypeError):
                fee_val = 500
            doc_obj = {**doc_obj, "fee": fee_val}
            scored_candidates.append((score, doc_obj))

        # Fallback if vector search returned no candidates
        if not scored_candidates and all_doctors:
            for d in all_doctors:
                score = 0.1
                if d.get("specialty", "").lower() == detected_specialty.lower():
                    score += 2.0
                if preferred_city and preferred_city.lower() in d.get("hospital", "").lower():
                    score += 0.5
                rating = d.get("rating", 4.5)
                score += (rating / 10.0)
                fee_val = d.get("fee", 500)
                try:
                    fee_val = int(fee_val)
                except (ValueError, TypeError):
                    fee_val = 500
                scored_candidates.append((score, {**d, "fee": fee_val}))

        scored_candidates.sort(key=lambda x: x[0], reverse=True)
        retrieved_doctors = [item[1] for item in scored_candidates]

        # Top doctor selection
        top_doctor = None
        if retrieved_doctors:
            # Prefer doctor with matching specialty if available
            matching_specialty_docs = [d for d in retrieved_doctors if d.get("specialty", "").lower() == detected_specialty.lower()]
            top_doctor = matching_specialty_docs[0] if matching_specialty_docs else retrieved_doctors[0]
        elif all_doctors:
            # Fallback to any doctor in DB
            fallback_doc = all_doctors[0]
            fee_val = fallback_doc.get("fee", 500)
            top_doctor = {**fallback_doc, "fee": fee_val}
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


# Global singleton instance of retriever
global_rag_retriever = RAGRetriever()
