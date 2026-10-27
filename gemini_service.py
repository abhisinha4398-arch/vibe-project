"""Gemini / Gemma chatbot service with conversation memory."""

from google import genai
from google.genai import types

from app.config import settings

# Initialise the client once at module level
_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.gemini_api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. "
                "Get one at https://aistudio.google.com/apikey"
            )
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


SYSTEM_INSTRUCTION = (
    "You are PIVOT Assistant, a helpful and friendly AI chatbot. "
    "You provide concise, accurate, and well-structured answers. "
    "When asked about code, include clear examples. "
    "Keep responses conversational but informative."
)


def chat_completion(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> str:
    """Send a conversation to Gemini and return the assistant's reply.

    Parameters
    ----------
    messages:
        A list of ``{"role": "user" | "model", "content": "..."}`` dicts
        representing the conversation history.
    temperature:
        Sampling temperature (0 → deterministic, 1 → creative).
    max_tokens:
        Maximum number of tokens in the response.

    Returns
    -------
    str
        The model's text response.
    """
    client = _get_client()

    # Convert to Gemini SDK Content objects
    contents: list[types.Content] = []
    for msg in messages:
        role = "model" if msg["role"] in ("assistant", "model") else "user"
        contents.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg["content"])],
            )
        )

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=temperature,
            max_output_tokens=max_tokens,
        ),
    )

    return response.text or "I'm sorry, I couldn't generate a response."
