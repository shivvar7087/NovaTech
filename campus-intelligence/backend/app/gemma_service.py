import json
import re
from typing import List, Optional, Tuple
import urllib.request
import urllib.error
from app.schemas import ParsedIntent, VerifiedResult

import os
try:
    from dotenv import load_dotenv
    load_dotenv()
    parent_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    if os.path.exists(parent_env):
        load_dotenv(parent_env)
except ImportError:
    pass

import socket
import time

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_API_URL = f"{OLLAMA_BASE_URL}/api/chat"
OLLAMA_TAGS_URL = f"{OLLAMA_BASE_URL}/api/tags"
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e2b")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "4.0"))

class GemmaService:
    def __init__(self, model_name: str = DEFAULT_MODEL):
        self.model_name = model_name
        self._cached_available = False
        self._last_check_time = 0.0

    def is_ollama_available(self) -> bool:
        """Check if local Ollama daemon is active and responding (cached for 15 seconds)."""
        now = time.time()
        if now - self._last_check_time < 15.0:
            return self._cached_available

        self._last_check_time = now
        try:
            req = urllib.request.Request(OLLAMA_TAGS_URL, method="GET")
            with urllib.request.urlopen(req, timeout=0.8) as response:
                self._cached_available = (response.status == 200)
                return self._cached_available
        except Exception:
            self._cached_available = False
            return False

    def interpret_question(self, question: str, available_buildings: List[str], available_metrics: Optional[List[str]] = None, primary_metric: str = "kwh_usage") -> Tuple[ParsedIntent, str]:
        """
        Uses Gemma 4 to parse the user's question into structured analysis parameters.
        DOES NOT perform numerical calculations.
        Falls back to rule-based parser if Ollama is offline.
        """
        available_metrics = available_metrics or ["kwh_usage", "cost_usd", "peak_demand_kw", "occupancy"]
        if primary_metric not in available_metrics:
            primary_metric = available_metrics[0] if available_metrics else "kwh_usage"
        if self.is_ollama_available():
            try:
                system_prompt = (
                    "You are the Campus Resource Intelligence Query Parser for arbitrary campus resource CSV datasets.\n"
                    "Your job is ONLY to extract the user's intent, target entities, and parameters from their question.\n"
                    "DO NOT compute or invent numbers. Python will perform all calculations.\n\n"
                    f"Available campus buildings: {json.dumps(available_buildings)}\n\n"
                    f"Available numeric dataset fields (choose the best matching field): {json.dumps(available_metrics)}\n"
                    f"Use this default field when the question does not name a metric: {primary_metric}.\n\n"
                    "Respond ONLY with a JSON object adhering to this schema:\n"
                    "{\n"
                    '  "intent_type": "total" | "average" | "ranking" | "comparison" | "timeseries" | "general",\n'
                    '  "metric": "one field from the available numeric dataset fields",\n'
                    '  "target_buildings": ["Building 1", ...],\n'
                    '  "time_frame": "weekend" | "weekday" | "peak" | "off-peak" | null,\n'
                    '  "chart_type": "bar" | "line" | "area" | "pie"\n'
                    "}"
                )

                payload = {
                    "model": self.model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": question}
                    ],
                    "stream": False,
                    "format": "json"
                }

                req = urllib.request.Request(
                    OLLAMA_API_URL,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )

                with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as resp:
                    res_data = json.loads(resp.read().decode("utf-8"))
                    content = res_data.get("message", {}).get("content", "")
                    parsed = json.loads(content)

                    # Validate and align target buildings with real dataset buildings
                    valid_targets = []
                    for b in parsed.get("target_buildings", []):
                        for real_b in available_buildings:
                            if b.lower() in real_b.lower() or real_b.lower() in b.lower():
                                if real_b not in valid_targets:
                                    valid_targets.append(real_b)

                    return ParsedIntent(
                        intent_type=parsed.get("intent_type", "total"),
                        metric=parsed.get("metric") if parsed.get("metric") in available_metrics else primary_metric,
                        target_buildings=valid_targets,
                        time_frame=parsed.get("time_frame"),
                        chart_type=parsed.get("chart_type", "bar")
                    ), f"Ollama ({self.model_name})"
            except Exception as e:
                print(f"Ollama interpretation fallback due to: {e}")
                self._cached_available = False
                self._last_check_time = time.time()

        # Intelligent Fallback Parser (Zero-dependency & instant)
        intent = self._rule_based_interpret(question, available_buildings, available_metrics, primary_metric)
        return intent, "Intelligent Pattern Engine (Ollama Offline / Standby)"

    def explain_verified_results(self, question: str, intent: ParsedIntent, result: VerifiedResult) -> Tuple[str, str]:
        """
        Uses Gemma 4 to formulate an executive, evidence-backed narrative based strictly
        on the verified numbers provided by Pandas.
        """
        if self.is_ollama_available():
            try:
                system_prompt = (
                    "You are the Campus Energy & Resource Intelligence Assistant.\n"
                    "Explain the verified mathematical findings produced by the Python backend in a professional, concise executive manner.\n"
                    "CRITICAL: Do NOT invent new numbers or contradict the verified values provided below. Cite the numbers exactly as given."
                )

                prompt = (
                    f"User Question: '{question}'\n"
                    f"Metric: {result.metric_name}\n"
                    f"Verified Value: {result.formatted_value} {result.unit}\n"
                    f"Summary: {result.summary_statement}\n"
                    f"Caveats: {'; '.join(result.caveats)}\n\n"
                    "Provide a concise 2-3 sentence executive briefing explaining these results to campus facility managers."
                )

                payload = {
                    "model": self.model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "stream": False
                }

                req = urllib.request.Request(
                    OLLAMA_API_URL,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )

                with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as resp:
                    res_data = json.loads(resp.read().decode("utf-8"))
                    text = res_data.get("message", {}).get("content", "").strip()
                    if text:
                        return text, f"Gemma 4 ({self.model_name})"
            except Exception as e:
                print(f"Ollama explanation fallback: {e}")
                self._cached_available = False
                self._last_check_time = time.time()

        # Synthesize clear verified explanation without LLM hallucination risk
        explanation = self._synthesize_verified_explanation(intent, result)
        return explanation, "Verified Analysis Engine"

    def _rule_based_interpret(self, question: str, available_buildings: List[str], available_metrics: Optional[List[str]] = None, primary_metric: str = "kwh_usage") -> ParsedIntent:
        q = question.lower()

        # Resolve a named CSV field or a common campus-resource term to its numeric column.
        available_metrics = available_metrics or ["kwh_usage", "cost_usd", "peak_demand_kw", "occupancy"]
        metric = primary_metric if primary_metric in available_metrics else available_metrics[0]
        normalized_q = re.sub(r"[^a-z0-9]+", " ", q).strip()
        aliases = {
            "cost": ("cost", "spend", "dollar", "bill", "expense", "price"),
            "electricity": ("electricity", "electric", "energy", "kwh", "kilowatt"),
            "water": ("water", "liter", "litre", "gallon", "gallons", "m3"),
            "waste": ("waste", "garbage", "trash", "recycling", "compost"),
            "air": ("air quality", "aqi", "pm25", "pm 2 5", "particulate", "co2", "carbon dioxide"),
            "mobility": ("mobility", "transit", "bus", "bicycle", "bike", "trip", "ridership", "transport"),
            "occupancy": ("occupancy", "people", "students", "crowd", "attendance", "visits"),
            "peak": ("peak", "demand", "surge"),
        }
        terms = [token for token in re.findall(r"[a-z0-9]+", normalized_q) if len(token) > 1]
        # Exact field mentions have priority, which lets users ask about custom CSV columns.
        exact = []
        for candidate in available_metrics:
            words = re.sub(r"[^a-z0-9]+", " ", candidate.lower()).strip()
            if words and words in normalized_q:
                exact.append(candidate)
        if exact:
            metric = exact[0]
        else:
            preferred = []
            for family, family_terms in aliases.items():
                if any(alias in normalized_q for alias in family_terms):
                    preferred.append(family)
            for family in preferred:
                candidates = [candidate for candidate in available_metrics if family in candidate.lower() or any(alias.replace(" ", "") in candidate.lower().replace("_", "") for alias in aliases[family])]
                if candidates:
                    metric = candidates[0]
                    break
            else:
                scored = []
                for candidate in available_metrics:
                    column_words = set(re.findall(r"[a-z0-9]+", candidate.lower()))
                    score = len(column_words.intersection(terms))
                    if score:
                        scored.append((score, candidate))
                if scored:
                    metric = max(scored, key=lambda item: item[0])[1]

        # 2. Identify Target Buildings
        targets = []
        for b in available_buildings:
            b_words = [w.lower() for w in b.split()]
            # If full name or distinct word appears (e.g. "Science", "Engineering", "Library", "Dormitory", "Athletics", "Union")
            if b.lower() in q:
                targets.append(b)
            elif any(w in q for w in b_words if len(w) > 3):
                if b not in targets:
                    targets.append(b)

        # 3. Identify Intent Type
        if any(w in q for w in ["compare", "versus", "vs", "difference", "between"]) or len(targets) >= 2:
            intent_type = "comparison"
            chart_type = "bar"
        elif any(w in q for w in ["rank", "highest", "most", "lowest", "least", "top", "bottom", "maximum", "minimum"]):
            intent_type = "ranking"
            chart_type = "bar"
        elif any(w in q for w in ["trend", "over time", "daily", "timeline", "history", "date", "days", "fluctuat"]):
            intent_type = "timeseries"
            chart_type = "area"
        elif any(w in q for w in ["average", "mean", "per day", "typically", "normal", "median"]):
            intent_type = "average"
            chart_type = "bar"
        else:
            intent_type = "total"
            chart_type = "bar"

        # 4. Time Frame
        time_frame = None
        if "weekend" in q:
            time_frame = "weekend"
        elif "weekday" in q:
            time_frame = "weekday"
        elif "off-peak" in q or "off peak" in q or "night" in q:
            time_frame = "off-peak"
        elif "peak" in q:
            time_frame = "peak"

        return ParsedIntent(
            intent_type=intent_type,
            metric=metric,
            target_buildings=targets,
            time_frame=time_frame,
            chart_type=chart_type
        )

    def _synthesize_verified_explanation(self, intent: ParsedIntent, result: VerifiedResult) -> str:
        """Constructs an evidence-backed factual briefing strictly using verified Python outputs."""
        if intent.intent_type == "ranking":
            return (
                f"Based on the uploaded dataset, {result.summary_statement} "
                "The ranking uses aggregated values from the available records."
            )
        elif intent.intent_type == "comparison":
            return (
                f"Direct comparative analysis confirms: {result.summary_statement} "
                "The caveats describe the record counts and date coverage used for the comparison."
            )
        elif intent.intent_type == "timeseries":
            return (
                f"Chronological time-series evaluation shows: {result.summary_statement} "
                "This view groups the available observations by date."
            )
        elif intent.intent_type == "average":
            return (
                f"Statistical calculation yields a mean of {result.formatted_value} {result.unit}. "
                f"{result.summary_statement}"
            )
        else:
            return (
                f"The uploaded dataset reports a verified total of {result.formatted_value} {result.unit}. "
                f"{result.summary_statement}"
            )

gemma_service = GemmaService()

