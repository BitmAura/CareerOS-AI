from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Pipeline", version="0.1.0")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

class MatchRequest(BaseModel):
    userId: str
    jobIds: Optional[List[str]] = None

class MatchResponse(BaseModel):
    userId: str
    matches: List[dict]

class OptimizeRequest(BaseModel):
    userId: str
    resumeId: str
    jobId: str

class OptimizeResponse(BaseModel):
    userId: str
    resumeId: str
    optimizedContent: str
    suggestions: List[str]

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-pipeline"}

@app.post("/match", response_model=MatchResponse)
async def match_jobs(request: MatchRequest):
    return MatchResponse(userId=request.userId, matches=[])

@app.post("/optimize-resume", response_model=OptimizeResponse)
async def optimize_resume(request: OptimizeRequest):
    return OptimizeResponse(
        userId=request.userId,
        resumeId=request.resumeId,
        optimizedContent="",
        suggestions=[]
    )

@app.post("/cover-letter")
async def generate_cover_letter(request: OptimizeRequest):
    return {"coverLetter": ""}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
