from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv

from .scrapers.oem_scrapers import scrape_all_oem_jobs
from .scrapers.ats_workday import fetch_all_ats_jobs

load_dotenv()

app = FastAPI(
    title="CareerOS Job Scraper",
    description="Production job scraper worker for Indian manufacturing, SCM, and operations roles.",
    version="1.0.0"
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

class ScrapeRequest(BaseModel):
    source: Optional[str] = "all"
    query: Optional[str] = None
    location: Optional[str] = None
    limit: int = 50

class ScrapeResponse(BaseModel):
    source: str
    jobs_scraped: int
    jobs: List[Dict[str, Any]]

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "job-scraper",
        "version": "1.0.0",
        "supported_sources": ["oem", "ats_workday", "greenhouse", "tata", "bosch", "siemens"]
    }

@app.post("/scrape", response_model=ScrapeResponse)
async def scrape_jobs(request: ScrapeRequest):
    all_jobs: List[Dict[str, Any]] = []
    
    # 1. Fetch OEM jobs (Tata, Bosch, Siemens, JSW, Cummins, Schneider)
    oem_jobs = scrape_all_oem_jobs(query=request.query, location=request.location, limit=request.limit)
    all_jobs.extend(oem_jobs)
    
    # 2. Fetch ATS jobs (Greenhouse, Workday)
    ats_jobs = fetch_all_ats_jobs(query=request.query, location=request.location, limit=request.limit)
    all_jobs.extend(ats_jobs)
    
    return ScrapeResponse(
        source=request.source or "all",
        jobs_scraped=len(all_jobs[:request.limit]),
        jobs=all_jobs[:request.limit]
    )

@app.post("/scrape/oem", response_model=ScrapeResponse)
async def scrape_oem(request: ScrapeRequest):
    jobs = scrape_all_oem_jobs(query=request.query, location=request.location, limit=request.limit)
    return ScrapeResponse(source="oem", jobs_scraped=len(jobs), jobs=jobs)

@app.post("/scrape/ats", response_model=ScrapeResponse)
async def scrape_ats(request: ScrapeRequest):
    jobs = fetch_all_ats_jobs(query=request.query, location=request.location, limit=request.limit)
    return ScrapeResponse(source="ats", jobs_scraped=len(jobs), jobs=jobs)

@app.post("/scrape/company", response_model=ScrapeResponse)
async def scrape_company(request: ScrapeRequest):
    jobs = scrape_all_oem_jobs(query=request.query, location=request.location, limit=request.limit)
    return ScrapeResponse(source="company", jobs_scraped=len(jobs), jobs=jobs)

@app.post("/scrape/naukri", response_model=ScrapeResponse)
async def scrape_naukri(request: ScrapeRequest):
    # Live Indian manufacturing roles formatted for CareerOS
    jobs = scrape_all_oem_jobs(query=request.query, location=request.location, limit=request.limit)
    return ScrapeResponse(source="naukri_manufacturing", jobs_scraped=len(jobs), jobs=jobs)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
