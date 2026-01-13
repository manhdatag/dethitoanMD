import { TikZRequest, TikZResponse } from '../types';

// API Configuration
const TIKZ_API_URL = 'TIKZ API URL';
const PANDOC_API_URL = 'PANDOC API URL';

/**
 * Compile TikZ/LaTeX snippet → PNG
 */
export async function compileTikz(payload: TikZRequest): Promise<TikZResponse> {
  try {
    const response = await fetch(`${TIKZ_API_URL}/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: payload.source,
        mode: payload.mode || 'auto',
        format: payload.format || 'png',
        density: payload.density || 300,
        packages: payload.packages || null,
        preamble: payload.preamble || '',
        transparent: payload.transparent ?? true,
        return_log: payload.returnLog ?? false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error("TikZ Compile Error:", error);
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Convert Markdown to DOCX using Pandoc API
 */
export async function convertMarkdownToDocx(markdown: string): Promise<Blob> {
  const response = await fetch(PANDOC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ markdown: markdown })
  });
  
  if (!response.ok) {
    throw new Error(`Pandoc Server Error: ${response.status}`);
  }
  
  return await response.blob();
}

/**
 * Helper to download Blob
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
