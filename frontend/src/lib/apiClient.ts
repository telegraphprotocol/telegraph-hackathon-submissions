import type { ChallengeResponse, Deadlines, IntentScore, Submission, SubmissionResponse, Track, WasmScore } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function describeFailedResponse(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.error === "string") return data.error;
  } catch {
    // ignore parse failure, fall through to generic message
  }
  return `Request failed (${res.status})`;
}

function uploadWithProgress(
  method: "POST" | "PUT",
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = undefined;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
      } else {
        const message =
          body && typeof body === "object" && "error" in (body as Record<string, unknown>)
            ? String((body as Record<string, unknown>).error)
            : `Request failed (${xhr.status})`;
        reject(new ApiError(message, xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError("Network error during upload"));
    xhr.send(formData);
  });
}

export const apiClient = {
  async requestChallenge(params: {
    address: string;
    track: Track;
    items?: string[];
    action?: "submit" | "edit" | "delete";
    submissionId?: string;
  }): Promise<ChallengeResponse> {
    const res = await fetch(`${API_BASE_URL}/api/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new ApiError(await describeFailedResponse(res), res.status);
    return res.json();
  },

  async submit(
    track: Track,
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<SubmissionResponse> {
    return uploadWithProgress(
      "POST",
      `${API_BASE_URL}/api/submissions/${track}`,
      formData,
      onProgress
    ) as Promise<SubmissionResponse>;
  },

  async editSubmission(
    track: Track,
    submissionId: string,
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<SubmissionResponse> {
    return uploadWithProgress(
      "PUT",
      `${API_BASE_URL}/api/submissions/${track}/${submissionId}`,
      formData,
      onProgress
    ) as Promise<SubmissionResponse>;
  },

  async deleteSubmission(
    track: Track,
    submissionId: string,
    body: { address: string; signature: string; nonce: string; issuedAt: string }
  ): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/submissions/${track}/${submissionId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new ApiError(await describeFailedResponse(res), res.status);
  },

  async getMySubmissions(address: string, track?: Track): Promise<Submission[]> {
    const query = track ? `?track=${track}` : "";
    const res = await fetch(`${API_BASE_URL}/api/submissions/mine/${address}${query}`);
    if (!res.ok) throw new ApiError(await describeFailedResponse(res), res.status);
    const data = await res.json();
    return data.submissions;
  },

  async getDeadlines(): Promise<Deadlines> {
    const res = await fetch(`${API_BASE_URL}/api/deadlines`);
    if (!res.ok) throw new ApiError(await describeFailedResponse(res), res.status);
    return res.json();
  },

  async getMinerStatus(id: string): Promise<unknown> {
    const res = await fetch(`${API_BASE_URL}/api/miners/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new ApiError(await describeFailedResponse(res), res.status);
    return res.json();
  },

  async adminGetMinerScores(params: {
    items: { address: string; id: string }[];
    password: string;
  }): Promise<Record<string, IntentScore[]>> {
    if (params.items.length === 0) return {};
    const res = await fetch(`${API_BASE_URL}/api/admin/miner-scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": params.password },
      body: JSON.stringify({ items: params.items }),
    });
    if (!res.ok) throw new ApiError(await describeFailedResponse(res), res.status);
    const data = await res.json();
    return data.scores;
  },

  async adminGetWasmScores(params: {
    ids: string[];
    password: string;
  }): Promise<Record<string, WasmScore | null>> {
    if (params.ids.length === 0) return {};
    const res = await fetch(`${API_BASE_URL}/api/admin/wasm-scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": params.password },
      body: JSON.stringify({ ids: params.ids }),
    });
    if (!res.ok) throw new ApiError(await describeFailedResponse(res), res.status);
    const data = await res.json();
    return data.scores;
  },

  async adminListSubmissions(params: { track?: Track; password: string }): Promise<Submission[]> {
    const query = params.track ? `?track=${params.track}` : "";
    const res = await fetch(`${API_BASE_URL}/api/admin/submissions${query}`, {
      headers: { "x-admin-password": params.password },
    });
    if (!res.ok) throw new ApiError(await describeFailedResponse(res), res.status);
    const data = await res.json();
    return data.submissions;
  },

  async adminDownloadFile(params: {
    submissionId: string;
    itemIndex: number;
    password: string;
    fileName: string;
  }): Promise<void> {
    const res = await fetch(
      `${API_BASE_URL}/api/admin/submissions/${params.submissionId}/files/${params.itemIndex}`,
      { headers: { "x-admin-password": params.password } }
    );
    if (!res.ok) throw new ApiError(await describeFailedResponse(res), res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = params.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  },
};
