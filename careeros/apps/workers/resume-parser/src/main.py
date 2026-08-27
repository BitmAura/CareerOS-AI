from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import tempfile
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="CareerOS Resume Parser", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextParseResponse(BaseModel):
    text: str
    engine: str
    chars: int


class ParseResponse(BaseModel):
    resume_id: str
    status: str
    parsed_data: Optional[dict] = None
    text: Optional[str] = None
    error: Optional[str] = None


def extract_with_markitdown(path: str) -> str:
    from markitdown import MarkItDown

    md = MarkItDown()
    result = md.convert(path)
    text = (result.text_content or "").strip()
    if not text:
        raise ValueError("MarkItDown returned empty text")
    return text


def extract_fallback(path: str, filename: str) -> str:
    lower = filename.lower()
    if lower.endswith(".docx") or lower.endswith(".doc"):
        import docx

        doc = docx.Document(path)
        return "\n".join(p.text for p in doc.paragraphs).strip()
    if lower.endswith(".pdf"):
        try:
            from pypdf import PdfReader
        except ImportError:
            from PyPDF2 import PdfReader  # type: ignore

        reader = PdfReader(path)
        parts = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        return "\n".join(parts).strip()
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read().strip()


@app.get("/health")
async def health():
    markitdown_ok = False
    try:
        import markitdown  # noqa: F401

        markitdown_ok = True
    except Exception:
        markitdown_ok = False
    return {
        "status": "ok",
        "service": "resume-parser",
        "markitdown": markitdown_ok,
    }


@app.post("/extract-text", response_model=TextParseResponse)
async def extract_text(file: UploadFile = File(...)):
    """Primary endpoint used by Next.js when RESUME_PARSE_URL is set."""
    suffix = os.path.splitext(file.filename or "resume.bin")[1] or ".bin"
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(raw)
        path = tmp.name

    try:
        try:
            text = extract_with_markitdown(path)
            engine = "markitdown"
        except Exception:
            text = extract_fallback(path, file.filename or "resume")
            engine = "fallback"
        if len(text) < 20:
            raise HTTPException(
                status_code=422,
                detail="Could not extract enough text (scanned PDF?). Paste text in the app.",
            )
        return TextParseResponse(text=text, engine=engine, chars=len(text))
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


@app.post("/parse", response_model=ParseResponse)
async def parse_resume(file: UploadFile = File(...)):
    try:
        extracted = await extract_text(file)
        return ParseResponse(
            resume_id="inline",
            status="parsed",
            text=extracted.text,
            parsed_data={"engine": extracted.engine, "chars": extracted.chars},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
