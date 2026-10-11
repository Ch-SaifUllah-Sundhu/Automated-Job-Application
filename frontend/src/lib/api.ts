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

export const api = {
  // Auth & Profile
  getProfile: (token: string) =>
    request<{ profile: Record<string, any> }>("/profile", { token }),

  updateProfile: (token: string, data: Record<string, any>) =>
    request<{ profile: Record<string, any> }>("/profile", {
      token,
      method: "PUT",
      body: JSON.stringify(data),
    }),

  uploadResume: (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ filename: string; text_length: number; preview: string }>(
      "/profile/resume",
      {
        token,
        method: "POST",
        body: formData,
      }
    );
  },

  // Jobs
  searchJobs: (token: string, query: string, location?: string) =>
    request<{ status: string; jobs_found: number }>("/search-jobs", {
      token,
      method: "POST",
      body: JSON.stringify({ query, location }),
    }),

  getJobs: (token: string, page = 1, pageSize = 20) =>
    request<{ jobs: any[]; total: number; page: number; page_size: number }>(
      `/jobs?page=${page}&page_size=${pageSize}`,
      { token }
    ),

  // Applications
  apply: (token: string, jobId: string) =>
    request<{ message: string; application_id: string }>("/apply", {
      token,
      method: "POST",
      body: JSON.stringify({ job_id: jobId }),
    }),

  getApplications: (token: string) =>
    request<{ applications: any[] }>("/applications", { token }),

  updateApplicationStatus: (token: string, id: string, status: string) =>
    request<{ message: string; application_id: string; status: string }>(
      `/applications/${id}/status`,
      {
        token,
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    ),
};
