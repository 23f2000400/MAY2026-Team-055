import requests
import json

API = 'http://127.0.0.1:8000/api'

# 1. Login to get patient token
login = requests.post(f'{API}/auth/login', json={'email': 'patient@nirog.in', 'password': 'nirog1234'}, timeout=10).json()
token = login['token']
headers = {'Authorization': f'Bearer {token}'}

# 2. Check RAG Status
status = requests.get(f'{API}/ai/rag/status', headers=headers, timeout=10).json()
print("=== 1. RAG PIPELINE STATUS ===")
print(json.dumps(status, indent=2))

# 3. Test Live Gemini RAG queries
queries = [
    "My 4-year-old child has high fever, severe cough and rash in Bengaluru",
    "Crushing chest pain with elevated blood pressure and palpitations",
    "Severe facial acne eruptions and itchy eczema rash"
]

print("\n=== 2. LIVE GEMINI RAG TEST RESULTS ===")
for q in queries:
    r = requests.post(f'{API}/ai/recommend', json={'description': q, 'city': 'Bengaluru'}, headers=headers, timeout=15)
    data = r.json()
    doc = data.get('doctor', {})
    print(f"\n[QUERY]: \"{q}\"")
    print(f"-> Doctor: {doc.get('name')} | Specialty: {doc.get('specialty')} | Fee: Rs.{doc.get('fee')}")
    print(f"-> Urgency: {data.get('urgency_level')} | Provider: {data.get('rag_metrics', {}).get('llm_provider')}")
    print(f"-> Reasoning: {data.get('reasoning')}")
    print(f"-> Sources Cited: {len(data.get('rag_sources', []))}")

