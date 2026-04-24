const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

export interface UploadedScan {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadStatus: string;
  analysisStatus: string;
  imageUrl?: string | null;
  createdAt: string;
}

export interface AnalysisResult {
  id: string;
  scanId: string;
  fileName: string;
  fileType: string;
  imageUrl?: string | null;
  result: string;
  confidence: number;
  tumorDetected: boolean;
  tumorType?: string | null;
  tumorGrade?: string | null;
  tumorLocation?: string | null;
  tumorSize?: string | null;
  tumorVolume?: string | null;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  reportText: string;
  modelVersion: string;
  createdAt: string;
}

async function apiRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const contentType = response.headers.get("content-type") || "";
  const responseData = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const message =
      (typeof responseData === "object" && responseData !== null && "detail" in responseData && typeof responseData.detail === "string" && responseData.detail) ||
      "Une erreur est survenue.";
    throw new Error(message);
  }

  return normalizeResponse(responseData as T);
}

function normalizeImageUrl(imageUrl?: string | null): string | null | undefined {
  if (!imageUrl) {
    return imageUrl;
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  return `${API_ORIGIN}${imageUrl}`;
}

function normalizeResponse<T>(data: T): T {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  if ("imageUrl" in data) {
    return {
      ...data,
      imageUrl: normalizeImageUrl((data as { imageUrl?: string | null }).imageUrl),
    } as T;
  }

  return data;
}

function withAuth(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function uploadScan(token: string, file: File): Promise<UploadedScan> {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<UploadedScan>("/scans/upload", {
    method: "POST",
    headers: withAuth(token),
    body: formData,
  });
}

export async function createAnalysis(token: string, scanId: string): Promise<AnalysisResult> {
  return apiRequest<AnalysisResult>("/analyses", {
    method: "POST",
    headers: {
      ...withAuth(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scanId }),
  });
}

export async function getAnalysisById(token: string, analysisId: string): Promise<AnalysisResult> {
  return apiRequest<AnalysisResult>(`/analyses/${analysisId}`, {
    method: "GET",
    headers: withAuth(token),
  });
}

export async function uploadAndAnalyzeScan(token: string, file: File): Promise<AnalysisResult> {
  const scan = await uploadScan(token, file);
  return createAnalysis(token, scan.id);
}