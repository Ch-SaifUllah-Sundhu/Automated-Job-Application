"""
Test script for Module 4 - Core LangGraph Agent
Run this file to test the complete agent pipeline.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent import agent_app

def test_agent():
    print("=" * 60)
    print("🚀 Testing Module 4: Core LangGraph Agent")
    print("=" * 60)

    # Sample input state
    test_input = {
        "keywords":     "Python Developer",
        "location":     "Remote",
        "user_resume":  """
Experienced Python developer with 3 years building REST APIs using FastAPI and Django.
Proficient in PostgreSQL, Docker, and CI/CD pipelines.
Built microservices deployed on AWS Lambda and Google Cloud Run.
""",
        "found_jobs":     [],
        "selected_job":   None,
        "tailored_resume":"",
        "cover_letter":   "",
        "status":         "",
        "error":          None
    }

    print("\n📋 Input:")
    print(f"  Keywords : {test_input['keywords']}")
    print(f"  Location : {test_input['location']}")
    print(f"  Resume   : {test_input['user_resume'][:80]}...")
    print()

    # Run agent
    result = agent_app.invoke(test_input)

    print("\n" + "=" * 60)
    print("📊 AGENT RESULTS:")
    print("=" * 60)
    print(f"\n✅ Status        : {result.get('status')}")
    print(f"🔍 Jobs Found    : {len(result.get('found_jobs', []))}")
    
    if result.get("found_jobs"):
        print("\n📌 First Job Found:")
        job = result["found_jobs"][0]
        print(f"   Title   : {job.get('title', 'N/A')}")
        print(f"   URL     : {job.get('url', 'N/A')}")

    if result.get("cover_letter"):
        print("\n📝 Cover Letter (first 300 chars):")
        print("-" * 40)
        print(result["cover_letter"][:300] + "...")
    
    if result.get("tailored_resume"):
        print("\n📄 Tailored Resume Bullets:")
        print("-" * 40)
        print(result["tailored_resume"][:300])

    if result.get("error"):
        print(f"\n❌ Error: {result['error']}")

    print("\n" + "=" * 60)
    print("✅ Module 4 Test Complete!")
    print("=" * 60)

if __name__ == "__main__":
    test_agent()
