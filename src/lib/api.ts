const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
const requestTimeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS || 10000);

function toUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBase}${normalizedPath}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(toUrl(path), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const payload = await response.json();
        if (payload?.detail) {
          errorMessage = payload.detail;
        } else if (typeof payload === "object") {
          errorMessage = JSON.stringify(payload);
        }
      } catch {
        const text = await response.text();
        if (text) {
          errorMessage = text;
        }
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return null as T;
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const getApiBaseUrl = () => apiBase;

export const fetchTickets = async () => request<any[]>("/tickets/");

export const submitTicket = async (ticketData: any) =>
  request<any>("/tickets/", {
    method: "POST",
    body: JSON.stringify(ticketData),
  });

export const updateTicket = async (id: number, updates: any) =>
  request<any>(`/tickets/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

export const submitFeedback = async (id: number, helpful: boolean) =>
  request<any>(`/tickets/${id}/feedback/`, {
    method: "POST",
    body: JSON.stringify({ helpful }),
  });

export const addTicketHistory = async (id: number, action: string, notes: string) =>
  request<any>(`/tickets/${id}/history/`, {
    method: "POST",
    body: JSON.stringify({ action, notes }),
  });

export const fetchAnalytics = async () => request<any>("/analytics/");

export const fetchEmployees = async () => request<any[]>("/employees/");

export const analyzeTicket = async (data: any) =>
  request<any>("/tickets/analyze/", {
    method: "POST",
    body: JSON.stringify(data),
  });
