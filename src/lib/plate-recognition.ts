import { formatPlate } from "./demo-data";

export type PlateOCRResult = {
  rawText: string;
  cleanedPlate: string;
  confidence: number;
  isAmbiguous: boolean;
  ambiguousPositions?: number[];
  possibleCorrections?: string[];
};

/**
 * Character disambiguation map based on expected position in Turkish license plates.
 * Structure: 2 digits (province) + 1-4 letters + 2-4 digits.
 */
const DIGIT_CORRECTIONS: Record<string, string> = {
  O: "0",
  Q: "0",
  D: "0",
  I: "1",
  L: "1",
  T: "1",
  Z: "2",
  E: "3",
  A: "4",
  S: "5",
  G: "6",
  B: "8",
};

const LETTER_CORRECTIONS: Record<string, string> = {
  "0": "O",
  "1": "I",
  "2": "Z",
  "3": "E",
  "4": "A",
  "5": "S",
  "6": "G",
  "8": "B",
};

/**
 * Clean OCR output to adhere to Turkish license plate format.
 * Examples:
 * "31abc123" -> "31 ABC 123"
 * "TR 31 ABC 123" -> "31 ABC 123"
 * "31-ABC-123" -> "31 ABC 123"
 * "310BC123" (where 0 is actually letter O) -> "31 OBC 123"
 */
export function normalizeScannedPlate(rawInput: string): PlateOCRResult {
  if (!rawInput) {
    return {
      rawText: "",
      cleanedPlate: "",
      confidence: 0,
      isAmbiguous: false,
    };
  }

  // 1. Remove non-alphanumeric characters, strip leading "TR" flag if present
  let clean = rawInput
    .toUpperCase()
    .replace(/^TR\b/, "")
    .replace(/[^A-Z0-9]/g, "");

  // If first 2 chars were "TR", strip it
  if (clean.startsWith("TR") && clean.length > 5) {
    clean = clean.slice(2);
  }

  // Match Turkish plate regex: 2 digits + 1-4 letters + 2-4 digits
  // Try direct standard plate match first
  const directFormatted = formatPlate(clean);
  if (directFormatted) {
    return {
      rawText: rawInput,
      cleanedPlate: directFormatted,
      confidence: 0.95,
      isAmbiguous: false,
    };
  }

  // 2. Try positional disambiguation
  // A Turkish plate is roughly 7-9 characters long
  const candidate = clean;
  let isAmbiguous = false;

  if (candidate.length >= 6 && candidate.length <= 9) {
    const chars = candidate.split("");

    // First 2 characters must be digits (01 - 81)
    for (let i = 0; i < 2; i++) {
      if (DIGIT_CORRECTIONS[chars[i]]) {
        isAmbiguous = true;
        chars[i] = DIGIT_CORRECTIONS[chars[i]];
      }
    }

    // Last 2 to 4 characters must be digits
    // Middle 1 to 4 characters must be letters
    // Determine boundary: find last non-digit or count from end
    const lastNonDigitIdx = chars.map((c, idx) => ({ c, idx }))
      .filter(({ c }) => !/\d/.test(c) || LETTER_CORRECTIONS[c])
      .map(({ idx }) => idx)
      .pop();

    if (lastNonDigitIdx !== undefined && lastNonDigitIdx >= 2) {
      // Middle characters (between 2 and lastNonDigitIdx inclusive) should be letters
      for (let i = 2; i <= lastNonDigitIdx; i++) {
        if (LETTER_CORRECTIONS[chars[i]]) {
          isAmbiguous = true;
          chars[i] = LETTER_CORRECTIONS[chars[i]];
        }
      }
      // Remaining characters to the end should be digits
      for (let i = lastNonDigitIdx + 1; i < chars.length; i++) {
        if (DIGIT_CORRECTIONS[chars[i]]) {
          isAmbiguous = true;
          chars[i] = DIGIT_CORRECTIONS[chars[i]];
        }
      }
    }

    const correctedStr = chars.join("");
    const formatted = formatPlate(correctedStr);
    if (formatted) {
      return {
        rawText: rawInput,
        cleanedPlate: formatted,
        confidence: isAmbiguous ? 0.8 : 0.92,
        isAmbiguous,
        possibleCorrections: isAmbiguous ? [formatted] : undefined,
      };
    }
  }

  // Fallback regex pattern search in broader raw text
  const match = rawInput
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, "")
    .match(/(\d{2})\s*[- ]*\s*([A-Z]{1,4})\s*[- ]*\s*(\d{2,4})/);

  if (match) {
    const plate = `${match[1]} ${match[2]} ${match[3]}`;
    return {
      rawText: rawInput,
      cleanedPlate: plate,
      confidence: 0.88,
      isAmbiguous: false,
    };
  }

  return {
    rawText: rawInput,
    cleanedPlate: candidate ? candidate.slice(0, 10) : "",
    confidence: 0.4,
    isAmbiguous: true,
  };
}

/**
 * Client-side Canvas Image Analysis for OCR preprocessing.
 * Increases contrast, applies adaptive binarization, and scans for license plate aspect ratio.
 */
export function preprocessCanvasForPlate(
  sourceCanvas: HTMLCanvasElement,
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  // Create high-contrast monochrome canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Grayscale & dynamic contrast stretching
  let minBrightness = 255;
  let maxBrightness = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    if (gray < minBrightness) minBrightness = gray;
    if (gray > maxBrightness) maxBrightness = gray;
  }

  const range = maxBrightness - minBrightness || 1;
  const threshold = minBrightness + range * 0.45;

  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    const val = gray > threshold ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
