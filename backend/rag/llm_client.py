"""LLM Client Adapter for NirogPath RAG.

Supports:
- Google Gemini API (gemini-1.5-flash / gemini-2.0-flash via REST)
- OpenAI API (gpt-4o-mini / gpt-3.5-turbo via REST)
- OpenAI-compatible endpoints (Groq, Ollama, DeepSeek, LocalAI)
- Local Semantic Synthesis Engine (zero-dependency deterministic & grounded fallback)
"""

import os
import json
import logging
import requests
from typing import Dict, Any, Optional

from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

logger = logging.getLogger("nirogpath.rag.llm_client")


class LLMClient:
    """Multi-provider LLM client for RAG generation."""

    def __init__(self):
        self._refresh_keys()

    def _refresh_keys(self):
        load_dotenv(ROOT_DIR / ".env")
        self.gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self.openai_key = os.environ.get("OPENAI_API_KEY")
        self.llm_base_url = os.environ.get("LLM_BASE_URL")
        self.llm_api_key = os.environ.get("LLM_API_KEY")
        self.llm_model = os.environ.get("LLM_MODEL", "gemini-1.5-flash")

    def get_active_provider(self) -> str:
        """Returns the name of the active LLM provider."""
        self._refresh_keys()
        if self.gemini_key:
            return "google_gemini"
        if self.openai_key:
            return "openai"
        if self.llm_base_url and self.llm_api_key:

            return "openai_compatible_custom"
        return "local_grounded_rag_engine"

    def generate_completion(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        """Calls the configured LLM provider or returns None if no provider is configured."""
        provider = self.get_active_provider()

        if provider == "google_gemini":
            return self._call_gemini(system_prompt, user_prompt)
        elif provider == "openai":
            return self._call_openai(system_prompt, user_prompt)
        elif provider == "openai_compatible_custom":
            return self._call_custom_llm(system_prompt, user_prompt)
        
        return None

    def _call_gemini(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        configured_model = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash").replace("models/", "")
        candidate_models = [configured_model, "gemini-3.6-flash", "gemini-3.7-flash", "gemini-flash-latest", "gemini-2.5-flash"]
        seen = set()
        models_to_try = [m for m in candidate_models if not (m in seen or seen.add(m))]

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": f"{system_prompt}\n\nUSER REQUEST:\n{user_prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024,
                "responseMimeType": "application/json"
            }
        }

        for model in models_to_try:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.gemini_key}"
                resp = requests.post(url, json=payload, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return text.strip()
                elif resp.status_code == 404:
                    continue
                else:
                    logger.warning(f"Gemini API ({model}) returned error {resp.status_code}: {resp.text[:200]}")
            except Exception as e:
                logger.warning(f"Failed to call Gemini API ({model}): {e}")
        return None


    def _call_openai(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.openai_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"}
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
            else:
                logger.warning(f"OpenAI API returned error {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.warning(f"Failed to call OpenAI API ({e}), falling back to local grounded synthesis.")
        return None

    def _call_custom_llm(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        try:
            url = f"{self.llm_base_url.rstrip('/')}/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.llm_api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": self.llm_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.2,
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.warning(f"Custom LLM endpoint failed ({e}), falling back.")
        return None


global_llm_client = LLMClient()
