export interface TikZRequest {
  source: string;
  mode?: string;
  format?: string;
  density?: number;
  packages?: string[] | null;
  preamble?: string;
  transparent?: boolean;
  returnLog?: boolean;
}

export interface TikZResponse {
  ok: boolean;
  image_base64?: string;
  pdf_base64?: string;
  width?: number;
  height?: number;
  log?: string;
  detail?: string;
}

export type ExerciseType = 'multiple_choice' | 'true_false' | 'short_answer' | 'unknown';

export interface Exercise {
  id: string;
  type: ExerciseType;
  question: string;
  rawQuestion: string;
  choices?: string[];
  statements?: string[]; // For True/False
  tfAnswers?: boolean[]; // For True/False
  answer?: string; // For Short Answer
  tikz?: string | null;
  solution?: string | null;
  solutionTikz?: string | null;
  correctChoice?: number;
}

export interface ProcessingState {
  status: 'idle' | 'parsing' | 'converting_images' | 'generating_doc' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}
