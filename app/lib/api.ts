// export const API_BASE = 'https://13.233.50.22';
// export const API_BASE = 'http://13.233.50.22:8000'
export const API_BASE = "http://13.126.59.122:8000"
// export const API_BASE = 'http://127.0.0.1:8000';

export async function fetchWithErrorHandling<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API ${res.status}: ${errorText}`);
    }
    return res.json();
}
  