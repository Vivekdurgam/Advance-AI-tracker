import json
import os
import urllib.error
import urllib.request

def analyze_ticket_mock(title, description):
    category = "Other"
    severity = "Low"
    route = "Assign to department"
    text = (title + " " + description).lower()
    
    if "password" in text or "reset" in text or "faq" in text or "policy" in text or "leave" in text:
        route = "Auto-resolve"
        if "leave" in text or "policy" in text:
            category = "HR"
        else:
            category = "Access"
    elif "down" in text or "crash" in text or "corruption" in text:
        severity = "Critical"
        category = "Server" if "down" in text else "DB"
    elif "pay" in text or "salary" in text or "reimbursement" in text:
        category = "HR"
    elif "bug" in text:
        category = "Bug"
        severity = "High"
    
    dept_map = {
        "DB": "Engineering", "Server": "Engineering", "Bug": "Engineering", "Feature": "Product",
        "HR": "HR", "Access": "IT", "Billing": "Finance", "Other": "IT"
    }
        
    dynamic_summary = f"User reported: {title.strip()[:120] or 'Issue'}. Key intent detected from description and routed accordingly."

    return {
        "category": category,
        "summary": dynamic_summary,
        "severity": severity,
        "recommended_resolution_path": route,
        "sentiment": "Neutral" if "!" not in text else "Frustrated",
        "predicted_department": dept_map.get(category, "IT"),
        "confidence_score": 90.0,
        "estimated_resolution_time": "2 hours",
        "auto_resolve_response": "Here are standard instructions to resolve your issue. Please check the intranet FAQ." if route == "Auto-resolve" else None
    }


def _extract_json_object(raw_text):
    text = (raw_text or "").strip()
    if not text:
        raise ValueError("Empty LLM response")

    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        return json.loads(text[start : end + 1])


def _get_provider_base_url(api_key):
    explicit = os.getenv("GROK_API_BASE_URL")
    if explicit:
        return explicit.rstrip("/")

    # `gsk_` keys are typically Groq API keys.
    if (api_key or "").startswith("gsk_"):
        return "https://api.groq.com/openai/v1"

    # Default to xAI's OpenAI-compatible API for Grok.
    return "https://api.x.ai/v1"


def _candidate_models(api_key, explicit_model):
    fallbacks = [m.strip() for m in os.getenv("GROK_FALLBACK_MODELS", "").split(",") if m.strip()]

    if explicit_model:
        candidates = [explicit_model] + fallbacks
    elif (api_key or "").startswith("gsk_"):
        candidates = ["llama-3.1-8b-instant"] + fallbacks
    else:
        candidates = ["grok-2-latest"] + fallbacks

    deduped = []
    for model in candidates:
        if model not in deduped:
            deduped.append(model)
    return deduped


def analyze_ticket_text(title, description):
    try:
        api_key = os.getenv("GROK_API_KEY")
        if not api_key:
            return analyze_ticket_mock(title, description)

        explicit_model = os.getenv("GROK_MODEL", "").strip()
        models_to_try = _candidate_models(api_key, explicit_model)
        api_base_url = _get_provider_base_url(api_key)
        chat_endpoint = f"{api_base_url}/chat/completions"
        timeout_seconds = int(os.getenv("GROK_TIMEOUT_SECONDS", "25"))

        prompt = f"""
        Analyze the following support ticket.
        Title: {title}
        Description: {description}

        Return ONLY one strict JSON object with these exact keys:
        - "category": one of Billing, Bug, Access, HR, Server, DB, Feature, Other
        - "summary": 2-3 concise sentences
        - "severity": one of Critical, High, Medium, Low
        - "recommended_resolution_path": exactly "Auto-resolve" or "Assign to department"
        - "sentiment": one of Frustrated, Neutral, Polite
        - "predicted_department": one of Engineering, Finance, HR, IT, Product, Marketing, Legal
        - "confidence_score": float between 0 and 100
        - "estimated_resolution_time": short string like "15 minutes", "2 hours"
        - "auto_resolve_response": if path is Auto-resolve, provide concrete step-by-step user-facing instructions; else null

        Routing matrix:
        - Database corruption or DB outage -> category DB, department Engineering, severity Critical
        - Server down/outage/performance incident -> category Server, department Engineering, severity Critical
        - Payroll/salary/reimbursement -> category Billing, department Finance
        - Leave policy / HR policy -> category HR, department HR
        - Access/account/login/password issues -> category Access, department IT
        - Product bug -> category Bug, department Product or Engineering
        - Marketing requests -> category Other, department Marketing
        - Legal/compliance -> category Other, department Legal, severity High

        Auto-resolve policy (important):
        - If user asks how to fix wrong password, forgot password, password reset, account unlock, FAQ/policy lookup, or status-check question,
          you MUST set "recommended_resolution_path" to "Auto-resolve".
        - For these Auto-resolve cases, "auto_resolve_response" must include clear next steps and when to contact IT/HR.
        - Do NOT assign simple password-help tickets to department unless the user explicitly says reset flow is broken after trying steps.
        - NEVER set "Auto-resolve" for backend/server/database outage, production incident, JavaScript/runtime failures, or crash-style issues.
          These must be "Assign to department" even if brief troubleshooting tips are known.
        """

        last_error = None
        for model_name in models_to_try:
            body = {
                "model": model_name,
                "temperature": 0,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a strict JSON API. Return only one valid JSON object and no extra text.",
                    },
                    {"role": "user", "content": prompt},
                ],
            }
            payload = json.dumps(body).encode("utf-8")
            req = urllib.request.Request(
                chat_endpoint,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                    "User-Agent": "Advanced-AI-Ticketing-System/1.0",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=timeout_seconds) as response:
                    raw = response.read().decode("utf-8")
                parsed = json.loads(raw)
                content = parsed["choices"][0]["message"]["content"]
                return _extract_json_object(content)
            except urllib.error.HTTPError as err:
                message = err.read().decode("utf-8", errors="ignore")
                last_error = f"Model `{model_name}` failed: HTTP {err.code} {message[:180]}"
                # Try next model on model-not-found style errors
                if err.code in (400, 404):
                    continue
                raise
            except Exception as err:
                last_error = f"Model `{model_name}` failed: {err}"
                continue

        if last_error:
            raise RuntimeError(last_error)
        raise RuntimeError("No model candidates available")
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, ValueError, json.JSONDecodeError) as e:
        print("Fallback to mock:", e)
        return analyze_ticket_mock(title, description)
    except Exception as e:
        print("Fallback to mock:", e)
        return analyze_ticket_mock(title, description)
