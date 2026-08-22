"""Medical Knowledge Base and Clinical Guidelines Corpus for NirogPath RAG.

Contains:
- Clinical guidelines across 15+ medical domains
- Symptom-to-specialty clinical reference matrices
- Urgency triage classifications
- Doctor profile document serializer for vector retrieval
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class ClinicalDocument:
    id: str
    title: str
    specialty: str
    symptoms: List[str]
    content: str
    urgency_level: str = "routine"  # routine, priority, urgent, emergency
    red_flags: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)

    def to_chunk_text(self) -> str:
        symptoms_str = ", ".join(self.symptoms)
        red_flags_str = ", ".join(self.red_flags) if self.red_flags else "None noted"
        return (
            f"CLINICAL GUIDELINE [{self.id}]: {self.title}\n"
            f"Primary Specialty: {self.specialty}\n"
            f"Urgency Level: {self.urgency_level.upper()}\n"
            f"Relevant Symptoms: {symptoms_str}\n"
            f"Red Flags: {red_flags_str}\n"
            f"Clinical Notes: {self.content}"
        )


CLINICAL_GUIDELINES_KB: List[ClinicalDocument] = [
    ClinicalDocument(
        id="CG-PEDIATRIC-001",
        title="Pediatric Acute & Subacute Symptom Triage Guidelines",
        specialty="Pediatrician",
        symptoms=[
            "child fever", "pediatric rash", "baby cough", "infant colic",
            "childhood immunization", "growth milestone delay", "pediatric vomiting",
            "toddler ear pain", "child diarrhea", "infant breathing difficulty"
        ],
        content=(
            "Pediatric patients (neonates, infants, children, adolescents under 18) presenting with fever, "
            "cough, unexplained rash, gastrointestinal distress, or developmental queries must be triaged "
            "primarily to a Board-Certified Pediatrician. Clinical protocols require age-adjusted dosing, "
            "pediatric vitals monitoring, and specialized growth and immunization assessment. "
            "For pediatric fevers persisting > 48 hours or accompanied by lethargy, priority outpatient review is indicated."
        ),
        urgency_level="priority",
        red_flags=["high fever in infant < 3 months", "lethargy", "stridor", "cyanosis", "severe dehydration"],
        tags=["pediatrics", "child", "infant", "baby", "toddler", "vaccine", "growth"]
    ),
    ClinicalDocument(
        id="CG-DERMATOLOGY-001",
        title="Dermatological Manifestations & Cutaneous Disorders Triage",
        specialty="Dermatologist",
        symptoms=[
            "skin rash", "acne vulgaris", "eczema", "psoriasis", "allergic contact dermatitis",
            "urticaria", "hives", "dandruff", "alopecia", "hair loss", "fungal skin infection",
            "pruritus", "skin itching", "pigmentation", "mole changes", "cutaneous lesions"
        ],
        content=(
            "Patients presenting with cutaneous lesions, epidermal inflammation, persistent pruritus, "
            "facial acne eruptions, suspected fungal or bacterial skin infections, or suspicious moles "
            "require expert evaluation by a Dermatologist. Differential diagnosis spans contact dermatitis, "
            "atopic eczema, psoriasis flares, and drug-induced eruptions. Topical vs systemic therapy "
            "must be determined by clinical examination."
        ),
        urgency_level="routine",
        red_flags=["rapidly spreading rash with fever", "blistering over large body surface", "mucosal involvement", "Stevens-Johnson syndrome suspicion"],
        tags=["skin", "rash", "dermatology", "acne", "allergy", "hair", "eczema", "mole"]
    ),
    ClinicalDocument(
        id="CG-CARDIOLOGY-001",
        title="Cardiovascular Symptom Triage & Hypertension Guidelines",
        specialty="Cardiologist",
        symptoms=[
            "chest pain", "angina", "chest heaviness", "palpitations", "shortness of breath on exertion",
            "hypertension", "elevated blood pressure", "irregular pulse", "arrhythmia", "edema in ankles",
            "cardiac checkup", "family history of heart disease", "high cholesterol"
        ],
        content=(
            "Cardiovascular presentations including retrosternal chest discomfort, palpitations, exercise-induced dyspnea, "
            "uncontrolled hypertension, or peripheral edema require comprehensive evaluation by a Cardiologist. "
            "Workup typically includes 12-lead ECG, 2D Echocardiogram, lipid profile stratification, and blood pressure monitoring. "
            "Stable exertional symptoms warrant prompt cardiology consultation within 24-48 hours."
        ),
        urgency_level="priority",
        red_flags=["crushing central chest pain radiating to jaw or left arm", "diaphoresis with syncope", "acute dyspnea at rest", "systolic BP > 180 mmHg"],
        tags=["heart", "chest", "cardio", "bp", "hypertension", "pulse", "palpitations", "angina"]
    ),
    ClinicalDocument(
        id="CG-ORTHOPEDIC-001",
        title="Musculoskeletal, Joint & Spine Disorders Clinical Guidelines",
        specialty="Orthopedic",
        symptoms=[
            "knee pain", "joint stiffness", "back pain", "lumbar spine pain", "neck pain", "cervical spondylosis",
            "bone fracture suspicion", "ligament tear", "sports injury", "osteoarthritis", "shoulder impingement",
            "tendonitis", "sciatica", "difficulty walking", "joint swelling"
        ],
        content=(
            "Musculoskeletal conditions involving joint degeneration (osteoarthritis), acute ligamentous injury (ACL/meniscus), "
            "lumbar spine radiculopathy (sciatica), or post-traumatic bone pain should be directed to an Orthopedic Specialist / Surgeon. "
            "Assessment includes clinical range-of-motion testing, weight-bearing X-rays, MRI imaging considerations, "
            "and conservative management (physiotherapy, NSAIDs) versus surgical intervention."
        ),
        urgency_level="routine",
        red_flags=["inability to bear weight after trauma", "open deformity", "cauda equina symptoms (urinary retention with back pain)", "acute septic arthritis signs"],
        tags=["bone", "joint", "orthopedic", "knee", "back", "spine", "fracture", "ligament", "osteoarthritis"]
    ),
    ClinicalDocument(
        id="CG-GENERAL-MEDICINE-001",
        title="Primary Care & General Internal Medicine Clinical Practice Guidelines",
        specialty="General Physician",
        symptoms=[
            "fever", "common cold", "viral cough", "sore throat", "generalized fatigue", "malaise",
            "headache", "body ache", "mild dehydration", "seasonal flu", "routine health checkup",
            "preventive wellness", "unexplained mild weakness", "vital signs review"
        ],
        content=(
            "Primary care presentations including acute febrile illness, upper respiratory tract infections (URTI), "
            "generalized body ache, tension headache, mild metabolic complaints, and routine preventive health checkups "
            "are ideally managed by a General Physician / Internal Medicine Specialist. The general physician coordinates "
            "baseline CBC, viral screening, symptomatic pharmacotherapy, and secondary referrals if specialized organ pathology is detected."
        ),
        urgency_level="routine",
        red_flags=["fever > 103°F unresponsive to antipyretics", "altered mental status", "severe persistent vomiting with inability to keep fluids"],
        tags=["fever", "cold", "cough", "headache", "fatigue", "general", "checkup", "physician", "flu", "wellness"]
    ),
    ClinicalDocument(
        id="CG-ENT-001",
        title="Otolaryngology (ENT) Diagnostic and Treatment Protocols",
        specialty="ENT Specialist",
        symptoms=[
            "earache", "otitis media", "hearing loss", "tinnitus", "sinusitis", "nasal congestion",
            "chronic sore throat", "tonsillitis", "hoarseness", "deviated nasal septum", "vertigo",
            "ear discharge", "nasal polyps", "foreign body in ear/nose"
        ],
        content=(
            "Ear, nose, and throat symptoms such as acute/chronic sinusitis, persistent otitis media, "
            "conductive or sensorineural hearing reduction, chronic tonsillar inflammation, or dysphonia "
            "warrant referral to an ENT Specialist (Otolaryngologist). Diagnostic endoscopy, otoscopy, "
            "and audiometric testing form key clinical tools."
        ),
        urgency_level="routine",
        red_flags=["sudden onset unilateral sensorineural hearing loss", "stridor", "severe peritonsillar abscess (quinsy)", "epistaxis refractory to direct pressure"],
        tags=["ear", "nose", "throat", "ent", "sinus", "tonsils", "hearing", "tinnitus", "vertigo"]
    ),
    ClinicalDocument(
        id="CG-ENDOCRINOLOGY-001",
        title="Metabolic, Glycemic & Thyroid Disorders Clinical Guidelines",
        specialty="Endocrinologist",
        symptoms=[
            "diabetes mellitus", "high blood sugar", "polydipsia", "polyuria", "thyroid dysfunction",
            "hypothyroidism", "hyperthyroidism", "unexplained weight gain", "unexplained weight loss",
            "PCOS", "polycystic ovary syndrome", "hormonal imbalance", "osteoporosis"
        ],
        content=(
            "Disorders of metabolic homeostasis including Type 1/2 Diabetes Mellitus, Graves' disease, "
            "Hashimoto's thyroiditis, adrenal insufficiency, and polycystic ovarian syndrome (PCOS) "
            "should be managed by an Endocrinologist. Targeted management involves HbA1c titration, "
            "TSH/Free T4 hormone assays, insulin regimen optimization, and lifestyle modification counseling."
        ),
        urgency_level="routine",
        red_flags=["diabetic ketoacidosis signs (fruity breath, Kussmaul breathing)", "thyroid storm (hyperpyrexia with severe tachycardia)"],
        tags=["diabetes", "sugar", "thyroid", "hormone", "pcos", "endocrine", "metabolism", "weight"]
    ),
    ClinicalDocument(
        id="CG-GASTRO-001",
        title="Gastrointestinal & Hepatic Disorders Clinical Guidelines",
        specialty="Gastroenterologist",
        symptoms=[
            "acid reflux", "GERD", "heartburn", "abdominal pain", "gastritis", "indigestion",
            "dyspepsia", "chronic constipation", "chronic diarrhea", "bloating", "IBS", "jaundice",
            "fatty liver", "ulcerative colitis", "peptic ulcer"
        ],
        content=(
            "Patients with chronic gastrointestinal distress, epigastric burning, suspected peptic ulcer disease, "
            "inflammatory bowel disease, hepatic dysfunction (elevated LFTs, jaundice), or unexplained bowel habit changes "
            "require consultation with a Gastroenterologist. Endoscopic evaluation (UGIE, colonoscopy) may be indicated."
        ),
        urgency_level="routine",
        red_flags=["hematemesis (coffee ground vomiting)", "melena (black tarry stools)", "acute severe peritonitis abdomen", "rapid painless jaundice"],
        tags=["stomach", "gastric", "acidity", "reflux", "abdomen", "liver", "digestion", "gastro", "ulcer"]
    ),
    ClinicalDocument(
        id="CG-NEUROLOGY-001",
        title="Neurological & Headache Disorder Clinical Practice Guidelines",
        specialty="Neurologist",
        symptoms=[
            "migraine", "severe cluster headache", "chronic tension headache", "dizziness", "vertigo",
            "peripheral neuropathy", "numbness in limbs", "tingling sensation", "tremors", "seizures",
            "memory loss", "facial nerve weakness", "Bell's palsy"
        ],
        content=(
            "Neurological symptoms including intractable migraines, new-onset seizures, peripheral neuropathic pain, "
            "movement disorders (tremors), or focal sensory deficits require specialized workup by a Neurologist. "
            "Neuro-imaging (Brain MRI/CT) and electroencephalography (EEG) or nerve conduction studies (NCS) may be utilized."
        ),
        urgency_level="priority",
        red_flags=["sudden thunderclap headache", "FAST signs (facial droop, arm weakness, slurred speech - stroke)", "first unprovoked seizure with altered sensorium"],
        tags=["headache", "migraine", "nerve", "neurology", "brain", "numbness", "seizure", "tremor", "dizziness"]
    ),
    ClinicalDocument(
        id="CG-EMERGENCY-TRIAGE-001",
        title="Acute Emergency & Red-Flag Clinical Triage Protocols",
        specialty="Emergency Medicine / General Physician",
        symptoms=[
            "acute chest pain", "unconscious", "unresponsive", "severe respiratory arrest",
            "massive hemorrhage", "severe anaphylaxis", "sudden paralysis", "poisoning"
        ],
        content=(
            "Patients demonstrating unstable hemodynamics, active airway compromise, suspected myocardial infarction, "
            "acute cerebrovascular stroke, or profound shock must be immediately routed to the nearest Hospital Emergency Room (ER) "
            "or Casualty rather than routine outpatient clinic booking. Immediate resuscitation takes absolute precedence."
        ),
        urgency_level="emergency",
        red_flags=["airway compromise", "cardiorespiratory arrest", "massive bleeding", "profound anaphylaxis"],
        tags=["emergency", "urgent", "critical", "casualty", "er", "hospital", "life-threatening"]
    ),
]


def get_clinical_guidelines() -> List[ClinicalDocument]:
    """Returns the full master clinical guidelines corpus."""
    return CLINICAL_GUIDELINES_KB


def format_doctor_knowledge_doc(doctor: Dict[str, Any]) -> str:
    """
    Serializes a MongoDB doctor profile record into a dense, semantically rich
    text chunk suitable for vector embedding and RAG prompt injection.
    """
    doc_id = doctor.get("id", "doc-unknown")
    name = doctor.get("name", "Doctor")
    specialty = doctor.get("specialty", "General Physician")
    exp = doctor.get("experience_years", doctor.get("experience", 5))
    fee = doctor.get("fee", 500)
    rating = doctor.get("rating", 4.8)
    hospital = doctor.get("hospital", "NirogPath Medical Center")
    city = doctor.get("city", "Bengaluru")
    phone = doctor.get("phone", "")
    bio = doctor.get("bio", f"Experienced {specialty} with {exp} years of clinical expertise treating acute and chronic conditions.")
    tags = doctor.get("tags", [specialty, "OPD Consultation", "Diagnostic Care"])
    if isinstance(tags, list):
        tags_str = ", ".join(str(t) for t in tags)
    else:
        tags_str = str(tags)

    return (
        f"DOCTOR PROFILE [{doc_id}]: {name}\n"
        f"Specialty: {specialty}\n"
        f"Experience: {exp} years\n"
        f"Consultation Fee: ₹{fee}\n"
        f"Patient Rating: {rating} / 5.0\n"
        f"Hospital / Clinic: {hospital} ({city})\n"
        f"Clinical Focus & Bio: {bio}\n"
        f"Areas of Expertise / Tags: {tags_str}\n"
        f"Contact: {phone}"
    )
