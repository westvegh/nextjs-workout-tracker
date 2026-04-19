export interface ApiVideo {
  url: string;
  format: string;
  resolution: string;
  aspectRatio: string;
  durationSeconds: number;
}

export interface ApiExercise {
  id: string;
  name: string;
  keywords: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  force: "push" | "pull" | "static" | null;
  level: "beginner" | "intermediate" | "advanced";
  mechanic: "compound" | "isolation" | null;
  category: string;
  instructions: string[];
  exerciseTips: string[];
  commonMistakes: string[];
  safetyInfo: string;
  overview: string;
  variations: string[];
  images: string[];
  videos: ApiVideo[];
}

export interface ApiStatsResponse {
  totalExercises: number;
  dataVersion: string;
  lastUpdated: string;
}

export interface ApiListResponse<T> {
  data: T[];
  total: number | null;
  limit: number;
  offset: number;
}

export interface ApiDetailResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    hint?: string;
    docs_url?: string;
    details?: unknown;
  };
}
