"""Chatbot API routes powered by Gemini / Gemma."""

from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status

from app.dependencies import CurrentUser
from app.gemini_service import chat_completion


router = APIRouter(prefix="/api/chat", tags=["chat"])


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str = Field(
        description="Either 'user' or 'assistant'",
        pattern="^(user|assistant)$",
    )
    content: str = Field(min_length=1, max_length=10_000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(
        min_length=1,
        description="Conversation history; the last message should be from the user.",
    )
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=8192)


class ChatResponse(BaseModel):
    reply: str


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("", response_model=ChatResponse)
def chat(body: ChatRequest, _current_user: CurrentUser) -> dict[str, str]:
    """Send a conversation to the Gemini model and get a response.

    The request body contains the full conversation history so the model
    has context.  Authentication is required.
    """
    try:
        reply = chat_completion(
            messages=[m.model_dump() for m in body.messages],
            temperature=body.temperature,
            max_tokens=body.max_tokens,
        )
    except RuntimeError as exc:
        # Missing API key
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini API error: {exc}",
        ) from exc

    return {"reply": reply}
