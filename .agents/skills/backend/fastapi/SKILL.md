---
name: fastapi
description: Hướng dẫn build REST API với FastAPI + Python cho DevVerse backend. Bao gồm project structure, Pydantic models, async patterns, dependency injection, và Supabase integration.
---

# FastAPI Skill — DevVerse Backend

## Project Structure

```
apps/api/
├── app/
│   ├── main.py              ← FastAPI app entry
│   ├── config.py            ← Settings (pydantic-settings)
│   ├── database.py          ← Supabase client
│   ├── routers/
│   │   ├── auth.py
│   │   ├── courses.py
│   │   ├── submissions.py
│   │   ├── quiz.py
│   │   └── ai_tutor.py
│   ├── models/              ← Pydantic schemas
│   │   ├── course.py
│   │   ├── submission.py
│   │   └── user.py
│   ├── services/            ← Business logic
│   │   ├── judge0.py
│   │   ├── rag_service.py
│   │   └── plagiarism.py
│   └── middleware/
│       ├── auth.py
│       └── rate_limit.py
├── tests/
├── requirements.txt
└── pyproject.toml
```

## 1. Main App

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import courses, submissions, quiz, ai_tutor, auth
from app.config import settings

app = FastAPI(
    title="DevVerse API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None
)

app.add_middleware(CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(courses.router, prefix="/api/courses", tags=["courses"])
app.include_router(submissions.router, prefix="/api/submissions", tags=["submissions"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["quiz"])
app.include_router(ai_tutor.router, prefix="/api/ai-tutor", tags=["ai"])

@app.get("/health")
async def health(): return {"status": "ok"}
```

## 2. Config (pydantic-settings)

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    OPENAI_API_KEY: str
    JUDGE0_URL: str
    JUDGE0_AUTH: str = ""
    REDIS_URL: str = "redis://localhost:6379"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]
    DEBUG: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
```

## 3. Pydantic Models

```python
from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime

class SubmissionCreate(BaseModel):
    problem_id: UUID4
    code: str
    language_id: int

    @validator('code')
    def validate_code(cls, v):
        if len(v) > 65536:
            raise ValueError('Code exceeds 64KB limit')
        if not v.strip():
            raise ValueError('Empty submission')
        return v

class SubmissionResponse(BaseModel):
    id: UUID4
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
```

## 4. Router Example

```python
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import require_role
from app.models.submission import SubmissionCreate, SubmissionResponse
from app.services.judge0 import enqueue_submission

router = APIRouter()

@router.post("/", response_model=SubmissionResponse)
async def create_submission(
    data: SubmissionCreate,
    current_user=Depends(require_role("student"))
):
    # Validate và enqueue
    submission = await supabase.from_("submissions").insert({
        "user_id": current_user.id,
        "problem_id": str(data.problem_id),
        "code": data.code,
        "language_id": data.language_id,
        "status": "pending"
    }).execute()

    await enqueue_submission(submission.data[0]["id"])
    return submission.data[0]
```

## Khi nào activate skill này

- Setup FastAPI project từ đầu
- Add new API endpoint
- Design request/response schemas
- Implement dependency injection
- Debug 422 Validation Error
