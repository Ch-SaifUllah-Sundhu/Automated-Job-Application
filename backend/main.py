from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Load from the parent directory since .env is at the root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or SUPABASE_URL == "your-supabase-project-url":
    print("Warning: Supabase keys are not set in .env")
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Job Application Assistant API")

class JobSearchRequest(BaseModel):
    keywords: str
    location: str

@app.get("/")
def read_root():
    return {"message": "Job Application Assistant API is running!"}
