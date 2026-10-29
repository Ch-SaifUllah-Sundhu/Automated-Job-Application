/**
 * frontend/src/lib/api.ts
 * =======================
 * Centralised HTTP client for all communication with the FastAPI backend.
 * All API calls across the application MUST go through this module;
 * never call fetch() inline in components.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiOptions extends RequestInit {
  token?: string | null;
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers = {}, ...rest } = options;
  const requestHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  // Only set application/json if body is not FormData
  if (!(rest.body instanceof FormData) && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: requestHeaders,
    ...rest,
  });

  if (!response.ok) {
    let errorDetail = "API request failed";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = `Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

// ── Type definitions ────────────────────────────────────────────────────────

export interface ProfileData {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  base_resume_text?: string | null;
  target_role?: string | null;
  target_location?: string | null;
  experience_level?: string | null;
  job_type?: string | null;
  preferences?: Record<string, unknown> | null;
  skills?: string[] | null;
}

export interface JobItem {
  id: string;
  title: string;
  company: string;
  url: string;
  location?: string | null;
  description?: string | null;
  source?: string | null;
  created_at?: string | null;
  match_score?: number | null;
  missing_skills?: string[] | null;
  matched_skills?: string[] | null;
}

export interface JobListResponse {
  jobs: JobItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ApplicationItem {
  id: string;
  job_id: string;
  job_title?: string | null;
  company?: string | null;
  url?: string | null;
  status: string;
  review_status?: string | null;
  workflow_status?: string | null;
  draft_version?: number | null;
  mode?: string | null;
  submission_mode?: string | null;
  submission_reference?: string | null;
  failure_reason?: string | null;
  cover_letter?: string | null;
  tailored_resume?: string | null;
  applied_at?: string | null;
  last_submitted_at?: string | null;
  created_at?: string | null;
  match_score?: number | null;
  missing_skills?: string[] | null;
  missing_fields?: string[] | null;
}

export interface AutomationLogItem {
  id?: string;
  event: string;
  detail?: string | null;
  screenshot_url?: string | null;
  created_at?: string | null;
}

export interface ApplicationDetailItem extends ApplicationItem {
  job_description?: string | null;
  job_location?: string | null;
  required_skills?: string | null;
  logs?: AutomationLogItem[] | null;
}

export interface JobSearchResponse {
  status: string;
  jobs_found: number;
  selected_job?: Record<string, unknown> | null;
  cover_letter: string;
  tailored_resume: string;
  error?: string | null;
}

export interface ResumeUploadResponse {
  filename: string;
  characters_extracted: number;
  preview: string;
  base_resume_text: string;
}

// ── API surface ─────────────────────────────────────────────────────────────

export const api = {
  // ── Auth & Profile ──────────────────────────────────────────────────────

  getMe: (token: string) =>
    request<ProfileData>("/auth/me", { token }),

  getProfile: (token: string) =>
    request<ProfileData>("/profile", { token }),

  updateProfile: (token: string, data: Partial<ProfileData>) =>
    request<ProfileData>("/profile", {
      token,
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteAccount: (token: string): Promise<{ message: string }> =>
    request<{ message: string }>("/auth/account", {
      token,
      method: "DELETE",
    }),

  uploadResume: (token: string, file: File): Promise<ResumeUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    return request<ResumeUploadResponse>("/profile/resume", {
      token,
      method: "POST",
      body: formData,
    });
  },

  // ── Jobs ────────────────────────────────────────────────────────────────

  /**
   * Runs the LangGraph search + tailoring pipeline on the backend.
   * @param keywords - Role title or tech stack keywords
   * @param location - Target location (defaults to "Remote")
   */
  searchJobs: (token: string, keywords: string, location = "Remote"): Promise<JobSearchResponse> =>
    request<JobSearchResponse>("/search-jobs", {
      token,
      method: "POST",
      body: JSON.stringify({ keywords, location }),
    }),

  /**
   * Paginated list of jobs stored in Supabase with semantic match scoring.
   * @param page - 1-based page number
   * @param limit - Items per page (max 100)
   * @param query - Optional keyword filter on job title
   * @param portal - Optional filter by portal/source
   * @param sort - Optional sort parameter (e.g. 'match_score')
   */
  getJobs: (
    token: string,
    page = 1,
    limit = 20,
    query?: string,
    portal?: string,
    sort?: string,
    location?: string
  ): Promise<JobListResponse> => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (query) params.set("query", query);
    if (portal && portal !== "all") params.set("portal", portal);
    if (sort) params.set("sort", sort);
    if (location && location !== "all") params.set("location", location);
    return request<JobListResponse>(`/jobs?${params.toString()}`, { token });
  },

  // ── Applications ────────────────────────────────────────────────────────

  /**
   * Saves or creates a job application in the user's workspace without falsely marking it applied.
   */
  saveJobApplication: (
    token: string,
    jobId: string,
    opts?: {
      cover_letter?: string;
      tailored_resume?: string;
      status?: string;
      workflow_status?: string;
      mode?: string;
    }
  ): Promise<ApplicationItem> =>
    request<ApplicationItem>("/applications/apply", {
      token,
      method: "POST",
      body: JSON.stringify({
        job_id: jobId,
        status: opts?.status || "Found",
        workflow_status: opts?.workflow_status || "discovered",
        mode: opts?.mode || "automatic",
        ...opts,
      }),
    }),

  /**
   * Creates or updates an application row for the authenticated user.
   */
  applyToJob: (
    token: string,
    jobId: string,
    opts?: { cover_letter?: string; tailored_resume?: string; status?: string }
  ): Promise<ApplicationItem> =>
    request<ApplicationItem>("/applications/apply", {
      token,
      method: "POST",
      body: JSON.stringify({ job_id: jobId, ...opts }),
    }),

  /**
   * Returns all applications for the authenticated user (array, not wrapped).
   */
  getApplications: (token: string): Promise<ApplicationItem[]> =>
    request<ApplicationItem[]>("/applications", { token }),

  /**
   * Updates the Kanban status of an application.
   * Valid statuses: Found | Applied | Interview | Offer | Rejected
   */
  updateApplicationStatus: (
    token: string,
    id: string,
    status: string
  ): Promise<ApplicationItem> =>
    request<ApplicationItem>(`/applications/${id}/status`, {
      token,
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  /**
   * Module 8: Retrieves application detail with job info and automation logs.
   */
  getApplication: (token: string, id: string): Promise<ApplicationDetailItem> =>
    request<ApplicationDetailItem>(`/applications/${id}`, { token }),

  /**
   * Module 8: Human-in-the-loop review updates (cover letter, bullets, review status).
   */
  updateReview: (
    token: string,
    id: string,
    data: { cover_letter?: string; tailored_resume?: string; review_status?: string }
  ): Promise<ApplicationDetailItem> =>
    request<ApplicationDetailItem>(`/applications/${id}/review`, {
      token,
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /**
   * Module 8: Approves application and queues background submission worker.
   */
  approveApplication: (token: string, id: string): Promise<ApplicationDetailItem> =>
    request<ApplicationDetailItem>(`/applications/${id}/approve`, {
      token,
      method: "PATCH",
    }),

  /**
   * Module 8 / P0: Confirms external manual submission on official job portal.
   */
  manualCompleteApplication: (
    token: string,
    id: string,
    data?: { submission_reference?: string; notes?: string }
  ): Promise<ApplicationDetailItem> =>
    request<ApplicationDetailItem>(`/applications/${id}/manual-complete`, {
      token,
      method: "POST",
      body: JSON.stringify(data || {}),
    }),

  /**
   * Module 8: Fetches execution audit trail events from automation_logs.
   */
  getApplicationLogs: (token: string, id: string): Promise<AutomationLogItem[]> =>
    request<AutomationLogItem[]>(`/applications/${id}/logs`, { token }),
};
