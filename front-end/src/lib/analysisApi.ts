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
  previewImageData?: string | null;
  latestAnalysisId?: string | null;
  createdAt: string;
}

export interface PositiveSlice {
  imageData: string;
  fileName: string;
  confidence: number;
  tumorType?: string | null;
  tumorLocation?: string | null;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export interface AnalysisResult {
  id: string;
  scanId: string;
  fileName: string;
  fileType: string;
  imageUrl?: string | null;
  result: string;
  confidence: number;
  tumorDetected?: boolean | null;
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
  reportText?: string | null;
  modelVersion?: string | null;
  positiveSlices?: PositiveSlice[];
  previewImageData?: string | null;
  createdAt: string;
}

export interface DashboardAnalysisSummary {
  id: string;
  result: string;
  confidence: number;
  createdAt: string;
}

export interface DashboardStats {
  totalScans: number;
  positiveScans: number;
  negativeScans: number;
  avgConfidence: number;
  analyses: DashboardAnalysisSummary[];
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

  // Data URIs and absolute URLs are used as-is
  if (/^(https?:\/\/|data:)/i.test(imageUrl)) {
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

export async function getDashboardStats(token: string): Promise<DashboardStats> {
  return apiRequest<DashboardStats>("/dashboard/stats", {
    method: "GET",
    headers: withAuth(token),
  });
}

export async function uploadAndAnalyzeScan(token: string, file: File): Promise<AnalysisResult> {
  const scan = await uploadScan(token, file);
  const analysis = await createAnalysis(token, scan.id);
  if (scan.previewImageData) {
    localStorage.setItem(`neuroscan_preview_${analysis.id}`, scan.previewImageData);
  }
  return { ...analysis, previewImageData: analysis.previewImageData || scan.previewImageData || null };
}

export async function uploadScanSeries(token: string, files: File[]): Promise<UploadedScan> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  return apiRequest<UploadedScan>("/scans/upload-series", {
    method: "POST",
    headers: withAuth(token),
    body: formData,
  });
}

export async function uploadAndAnalyzeScanSeries(token: string, files: File[]): Promise<AnalysisResult> {
  const scan = await uploadScanSeries(token, files);
  // The analysis is created server-side during upload; use its ID directly to
  // avoid a second authenticated call (which would fail if the token expired
  // during the long inference on many images).
  const analysis = scan.latestAnalysisId
    ? await getAnalysisById(token, scan.latestAnalysisId)
    : await createAnalysis(token, scan.id);
  if (scan.previewImageData) {
    localStorage.setItem(`neuroscan_preview_${analysis.id}`, scan.previewImageData);
  }
  return { ...analysis, previewImageData: analysis.previewImageData || scan.previewImageData || null };
}