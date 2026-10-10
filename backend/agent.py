"""
Module 4: Core LangGraph Agent
- Task 1: Connect to Supabase
- Task 2: Search jobs via DuckDuckGo
- Task 3: Generate tailored cover letter via Groq (Llama 3)
- Task 4: Save results to Supabase
- Task 5: Full LangGraph state machine
"""
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Dict, Any, Optional
from langchain_groq import ChatGroq
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from duckduckgo_search import DDGS

# Load .env from root project folder
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ─────────────────────────────────────────────
# Task 1: Supabase Client Setup
# ─────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Supabase connected successfully!")
else:
    supabase = None
    print("⚠️  Supabase not connected. Check .env file.")


# ─────────────────────────────────────────────
# Agent State Definition
# ─────────────────────────────────────────────
class AgentState(TypedDict):
    keywords: str
    location: str
    user_resume: str          # Base resume text from user profile
    found_jobs: List[Dict[str, Any]]
    selected_job: Optional[Dict[str, Any]]
    tailored_resume: str
    cover_letter: str
    status: str
    error: Optional[str]


# ─────────────────────────────────────────────
# Task 2: Node - Search Jobs via DuckDuckGo
# ─────────────────────────────────────────────
def search_jobs(state: AgentState) -> Dict:
    """Search for jobs using DuckDuckGo. No API key required."""
    print(f"\n🔍 [Node 1] Searching for: {state['keywords']} in {state['location']}")
    
    query = f"{state['keywords']} job openings in {state['location']} site:linkedin.com OR site:indeed.com OR site:greenhouse.io"
    
    try:
        results = DDGS().text(query, max_results=5)
        
        jobs = []
        if results:
            for r in results:
                jobs.append({
                    "title": r.get("title", "Unknown"),
                    "url": r.get("href", ""),
                    "description": r.get("body", ""),
                    "company": r.get("title", "").split(" - ")[-1] if " - " in r.get("title", "") else "Unknown"
                })
        
        print(f"✅ Found {len(jobs)} jobs.")
        return {"found_jobs": jobs, "status": "Jobs Found", "error": None}
    
    except Exception as e:
        print(f"❌ Search failed: {e}")
        return {"found_jobs": [], "status": "Search Failed", "error": str(e)}


# ─────────────────────────────────────────────
# Task 3: Node - Draft Cover Letter via Groq/Llama3
# ─────────────────────────────────────────────
def draft_documents(state: AgentState) -> Dict:
    """Use Groq (Llama 3) to generate a tailored cover letter."""
    print(f"\n✍️  [Node 2] Drafting cover letter with Groq (Llama 3)...")
    
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return {"cover_letter": "", "tailored_resume": "", "status": "Failed", "error": "GROQ_API_KEY not set"}

    if not state.get("found_jobs"):
        return {"cover_letter": "", "tailored_resume": "", "status": "No Jobs Found", "error": "No jobs to apply to"}
    
    try:
        llm = ChatGroq(model="llama3-8b-8192", api_key=api_key, temperature=0.7)
        
        # Pick the first job
        job = state["found_jobs"][0]
        job_title = job.get("title", "Software Engineer")
        job_desc = job.get("description", "")
        user_resume = state.get("user_resume", "Experienced professional with relevant skills.")
        
        # Cover Letter Prompt
        cover_letter_prompt = f"""
You are an expert career coach. Write a compelling, professional cover letter.

Job Title: {job_title}
Job Description: {job_desc[:500]}

Candidate's Resume Summary:
{user_resume[:500]}

Instructions:
- Write exactly 3 paragraphs.
- Paragraph 1: Express enthusiasm for the role and company.
- Paragraph 2: Highlight 2-3 most relevant skills matching the job.
- Paragraph 3: Strong closing statement.
- Keep it under 300 words.
- Do NOT include placeholders like [Your Name] or [Date].
"""
        cover_letter_response = llm.invoke(cover_letter_prompt)
        cover_letter = cover_letter_response.content
        
        # Tailored Resume Bullet Points
        resume_prompt = f"""
Given this job description: {job_desc[:400]}
And this resume: {user_resume[:400]}

Rewrite 3 bullet points from the resume to better match the job description keywords. Return only the bullet points.
"""
        resume_response = llm.invoke(resume_prompt)
        tailored_resume = resume_response.content
        
        print("✅ Cover letter and tailored resume generated!")
        return {
            "cover_letter": cover_letter,
            "tailored_resume": tailored_resume,
            "selected_job": job,
            "status": "Drafting Complete",
            "error": None
        }
    
    except Exception as e:
        print(f"❌ Drafting failed: {e}")
        return {"cover_letter": "", "tailored_resume": "", "status": "Drafting Failed", "error": str(e)}


# ─────────────────────────────────────────────
# Task 4: Node - Save to Supabase
# ─────────────────────────────────────────────
def save_to_database(state: AgentState) -> Dict:
    """Save found job and generated documents to Supabase."""
    print(f"\n💾 [Node 3] Saving results to Supabase...")
    
    if not supabase:
        print("⚠️  Skipping DB save - Supabase not connected.")
        return {"status": "DB Skipped (No Connection)"}
    
    if state.get("status") in ["Failed", "Search Failed", "No Jobs Found"]:
        return {"status": state["status"]}
    
    try:
        job = state.get("selected_job", {})
        
        # Save job to jobs table (ignore conflict if URL exists)
        job_url = job.get("url", "")
        if job_url:
            job_data = {
                "title": job.get("title", "Unknown"),
                "company": job.get("company", "Unknown"),
                "url": job_url,
                "description": job.get("description", ""),
                "source": "DuckDuckGo"
            }
            supabase.table("jobs").upsert(job_data, on_conflict="url").execute()
            print(f"✅ Job saved: {job.get('title')}")
        
        return {"status": "Saved to DB"}
    
    except Exception as e:
        print(f"❌ DB save failed: {e}")
        return {"status": "DB Save Failed", "error": str(e)}


# ─────────────────────────────────────────────
# Task 5: Build & Compile LangGraph State Machine
# ─────────────────────────────────────────────
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("search",  search_jobs)
workflow.add_node("draft",   draft_documents)
workflow.add_node("save_db", save_to_database)

# Define flow: search → draft → save → END
workflow.set_entry_point("search")
workflow.add_edge("search",  "draft")
workflow.add_edge("draft",   "save_db")
workflow.add_edge("save_db", END)

# Compile
agent_app = workflow.compile()
print("✅ LangGraph agent compiled and ready!")
