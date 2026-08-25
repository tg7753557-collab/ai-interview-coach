import os
import json
import io
import sys
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from pypdf import PdfReader

# Load .env
env_path = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not set.")

client = genai.Client(api_key=api_key)

app = FastAPI(title="HireMind AI Backend", version="1.0.0")

# Enable CORS for React Frontend (default Vite port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Models -----------------
class StartSessionRequest(BaseModel):
    name: str
    target_role: str
    company_style: str
    round_type: str
    experience: str
    resume_text: Optional[str] = ""

class NextQuestionRequest(BaseModel):
    candidate_name: str
    target_role: str
    company_style: str
    round_type: str
    experience: str
    resume_text: Optional[str] = ""
    transcript: List[dict]

class EvaluateRequest(BaseModel):
    candidate_name: str
    target_role: str
    company_style: str
    round_type: str
    experience: str
    transcript: List[dict]

class CodeExecutionRequest(BaseModel):
    code: str

# ----------------- Endpoints -----------------

@app.post("/api/resume/parse")
async def parse_resume(file: UploadFile = File(...)):
    try:
        pdf_reader = PdfReader(file.file)
        text = ""
        for page in pdf_reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
        return {"success": True, "text": text.strip()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")

@app.post("/api/interview/start")
def start_interview(req: StartSessionRequest):
    prompt = f"""
    You are a senior technical hiring manager conducting a '{req.round_type}' interview.
    Company Style: {req.company_style}.
    Candidate: {req.name}, Role: {req.target_role} ({req.experience}).
    Resume context: {req.resume_text[:1500] if req.resume_text else "No resume provided."}

    Task:
    Welcome the candidate and pose your first targeted interview question or coding problem.
    Keep it professional, natural, and concise (2-3 sentences max).
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return {"question": response.text.strip()}

@app.post("/api/interview/next")
def next_question(req: NextQuestionRequest):
    prompt = f"""
    You are conducting an active {req.round_type} interview for {req.target_role} ({req.experience}).
    Company Style: {req.company_style}
    Candidate: {req.candidate_name}
    Resume Snippet: {req.resume_text[:800] if req.resume_text else ""}

    Full Conversation Transcript:
    {json.dumps(req.transcript, indent=2)}

    Task:
    Evaluate the candidate's last answer/code, provide a brief acknowledgment, and ask a relevant adaptive follow-up or challenge their technical trade-offs.
    Keep it concise (2-3 sentences max).
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return {"question": response.text.strip()}

@app.post("/api/interview/evaluate")
def evaluate_interview(req: EvaluateRequest):
    prompt = f"""
    You are the Lead Hiring Committee Chair. 
    Evaluate this complete interview transcript for {req.candidate_name} applying for {req.target_role} ({req.experience}).
    Round: {req.round_type} | Style: {req.company_style}

    Transcript:
    {json.dumps(req.transcript, indent=2)}

    Output a structured JSON response matching this schema:
    {{
      "scores": {{
         "technical": 85,
         "communication": 80,
         "problem_solving": 90,
         "code_quality": 85,
         "overall": 85
      }},
      "verdict": "STRONG HIRE",
      "strengths": ["...", "..."],
      "improvements": ["...", "..."],
      "feedback_summary": "..."
    }}
    Return ONLY raw valid JSON.
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={"response_mime_type": "application/json"}
    )
    return json.loads(response.text)

@app.post("/api/code/run")
def run_code(req: CodeExecutionRequest):
    old_stdout = sys.stdout
    redirected_output = sys.stdout = io.StringIO()
    try:
        exec(req.code, {})
        output = redirected_output.getvalue()
        return {"output": output if output else "[Code executed successfully with no stdout output]"}
    except Exception as e:
        return {"output": f"Execution Error: {str(e)}"}
    finally:
        sys.stdout = old_stdout

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)