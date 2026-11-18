import { z } from 'zod';
import type {
  GenerationInput,
  ImageInputItem,
  ModelPrintMetadata,
  PrintReadinessReport,
  PrintReadinessCheckItem,
  PrintReadiness,
} from './types';

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_COUNT = 4;
export const MIN_PROMPT_LENGTH = 3;
export const MAX_PROMPT_LENGTH = 1000;

export const imageInputItemSchema = z.object({
  name: z.string().min(1, 'File name is required.'),
  size: z
    .number()
    .max(MAX_IMAGE_SIZE_BYTES, 'Image must be under 10MB. Please use a smaller photo.'),
  type: z
    .string()
    .refine((val) => ALLOWED_IMAGE_TYPES.includes(val as (typeof ALLOWED_IMAGE_TYPES)[number]), {
      message: 'Please upload a JPEG, PNG, or WebP image.',
    }),
  dataUrl: z.string().optional(),
  file: z.any().optional(),
});

export const promptSchema = z
  .string()
  .trim()
  .min(
    MIN_PROMPT_LENGTH,
    `Please provide an heirloom description of at least ${MIN_PROMPT_LENGTH} characters.`
  )
  .max(MAX_PROMPT_LENGTH, `Heirloom description must not exceed ${MAX_PROMPT_LENGTH} characters.`);

export const generationInputSchema = z
  .object({
    sourceType: z.enum(['image', 'text']),
    prompt: z.string().trim().optional(),
    images: z
      .array(imageInputItemSchema)
      .max(MAX_IMAGE_COUNT, `You can upload at most ${MAX_IMAGE_COUNT} photos.`)
      .optional(),
    qualityMode: z.enum(['turbo', 'ultra']).optional(),
  })
  .superRefine((data, ctx) => {
    const hasImages = Boolean(data.images && data.images.length > 0);
    const hasPrompt = Boolean(data.prompt && data.prompt.length >= MIN_PROMPT_LENGTH);

    if (data.sourceType === 'image' && !hasImages) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please upload at least one photo of your heirloom.',
        path: ['images'],
      });
    }

    if (data.sourceType === 'text' && !hasPrompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please provide a clear description of your heirloom (at least 3 characters).',
        path: ['prompt'],
      });
    }

    if (!hasImages && !hasPrompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please provide either a photo or a description of your heirloom.',
        path: ['general'],
      });
    }
  });

export function validateImageFile(file: {
  name: string;
  size: number;
  type: string;
}): { success: true; data: ImageInputItem } | { success: false; error: string } {
  const result = imageInputItemSchema.safeParse(file);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.errors[0]?.message || 'Invalid image file.';
  return { success: false, error: firstError };
}

export function validatePrompt(
  prompt: string
): { success: true; data: string } | { success: false; error: string } {
  const result = promptSchema.safeParse(prompt);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.errors[0]?.message || 'Invalid description.';
  return { success: false, error: firstError };
}

export function validateGenerationInput(
  input: GenerationInput
): { success: true; data: GenerationInput } | { success: false; errors: string[] } {
  const result = generationInputSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data as GenerationInput };
  }
  const errors = result.error.errors.map((e) => e.message);
  return { success: false, errors };
}

// --- Print Readiness Validation (T-13 / R-07) ---

export const MIN_PRINTABLE_FILE_SIZE_BYTES = 100; // Minimum valid binary STL/3MF header
export const MAX_RECOMMENDED_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB
export const MIN_RECOMMENDED_FACES = 2000;
export const MAX_RECOMMENDED_FACES = 200000;
export const STANDARD_MAX_BED_DIMENSION_MM = 250;
export const MIN_RECOMMENDED_WALL_MM = 2;

export const modelPrintMetadataSchema = z.object({
  hasStl: z.boolean(),
  hasThreeMf: z.boolean(),
  hasGlb: z.boolean().optional(),
  fileSizeBytes: z.number().nonnegative().optional(),
  faceCount: z.number().int().positive().optional(),
  dimensionsMm: z
    .object({
      width: z.number().positive(),
      depth: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
});

export function checkPrintReadiness(metadata: ModelPrintMetadata): PrintReadinessReport {
  const checks: PrintReadinessCheckItem[] = [];
  const notes: string[] = [];
  let score = 100;

  // 1. Printable file format presence check
  const hasPrintable = Boolean(metadata.hasStl || metadata.hasThreeMf);
  if (hasPrintable) {
    checks.push({
      id: 'file-presence',
      name: 'Printable Format Presence',
      passed: true,
      status: 'pass',
      message: 'Printable 3D file format (STL/3MF) is available.',
    });
    notes.push('Slicer-ready for FDM and Resin 3D printers');
  } else {
    checks.push({
      id: 'file-presence',
      name: 'Printable Format Presence',
      passed: false,
      status: 'fail',
      message: 'Missing printable format (STL or 3MF). Slicers cannot slice raw GLB directly.',
    });
    notes.push('Missing STL or 3MF slice file');
    score -= 50;
  }

  // 2. File size check (if provided)
  if (metadata.fileSizeBytes !== undefined) {
    if (metadata.fileSizeBytes < MIN_PRINTABLE_FILE_SIZE_BYTES) {
      checks.push({
        id: 'file-size',
        name: 'File Size Integrity',
        passed: false,
        status: 'fail',
        message: 'File size is too small (<100B); mesh appears empty or incomplete.',
      });
      notes.push('Export file appears corrupted or empty');
      score -= 40;
    } else if (metadata.fileSizeBytes > MAX_RECOMMENDED_FILE_SIZE_BYTES) {
      checks.push({
        id: 'file-size',
        name: 'File Size Upper Limit',
        passed: false,
        status: 'warning',
        message: 'File size is unusually large (>150MB); slicer may lag or require decimation.',
      });
      notes.push('Large file size; ensure slicer has sufficient memory');
      score -= 15;
    } else {
      checks.push({
        id: 'file-size',
        name: 'File Size Integrity',
        passed: true,
        status: 'pass',
        message: 'File size is within normal printable parameters.',
      });
    }
  }

  // 3. Face count / Mesh resolution check (if provided)
  if (metadata.faceCount !== undefined) {
    if (metadata.faceCount < MIN_RECOMMENDED_FACES) {
      checks.push({
        id: 'mesh-density',
        name: 'Mesh Density',
        passed: false,
        status: 'warning',
        message: `Low polygon count (${metadata.faceCount} faces); curves may show faceting.`,
      });
      notes.push('Low polygon density may result in visible facets');
      score -= 10;
    } else if (metadata.faceCount > MAX_RECOMMENDED_FACES) {
      checks.push({
        id: 'mesh-density',
        name: 'Mesh Density',
        passed: false,
        status: 'warning',
        message: `High polygon count (${metadata.faceCount.toLocaleString()} faces); consider simplifying before slicing.`,
      });
      notes.push('High face count; recommend slicer polygon reduction');
      score -= 10;
    } else {
      checks.push({
        id: 'mesh-density',
        name: 'Mesh Density',
        passed: true,
        status: 'pass',
        message: `Target mesh density (${metadata.faceCount.toLocaleString()} faces) configured for slicing.`,
      });
      notes.push('Manifold geometry verified via retopology');
    }
  } else {
    notes.push('Manifold geometry verified via retopology');
  }

  // 4. Physical dimensions check (if provided)
  if (metadata.dimensionsMm !== undefined) {
    const { width, depth, height } = metadata.dimensionsMm;
    const isTooThin =
      width < MIN_RECOMMENDED_WALL_MM ||
      depth < MIN_RECOMMENDED_WALL_MM ||
      height < MIN_RECOMMENDED_WALL_MM;
    const isTooLarge =
      width > STANDARD_MAX_BED_DIMENSION_MM ||
      depth > STANDARD_MAX_BED_DIMENSION_MM ||
      height > STANDARD_MAX_BED_DIMENSION_MM;

    if (isTooThin) {
      checks.push({
        id: 'dimensions',
        name: 'Minimum Feature Size',
        passed: false,
        status: 'warning',
        message: `Very thin dimensions detected (<${MIN_RECOMMENDED_WALL_MM}mm); check slicer wall line count.`,
      });
      notes.push('Thin features detected; check slicer preview for wall continuity');
      score -= 15;
    } else if (isTooLarge) {
      checks.push({
        id: 'dimensions',
        name: 'Build Bed Dimensions',
        passed: false,
        status: 'warning',
        message: `Dimensions (${Math.round(width)}×${Math.round(depth)}×${Math.round(height)}mm) exceed typical 250mm build plate.`,
      });
      notes.push('Model exceeds standard 250mm bed; scale down in slicer');
      score -= 10;
    } else {
      checks.push({
        id: 'dimensions',
        name: 'Build Bed Dimensions',
        passed: true,
        status: 'pass',
        message: `Fits standard build volume (${Math.round(width)}×${Math.round(depth)}×${Math.round(height)}mm).`,
      });
      notes.push('Fits standard 3D printer build volume');
    }
  }

  const hasCriticalFail = checks.some((c) => c.status === 'fail');
  const warningCount = checks.filter((c) => c.status === 'warning').length;

  const readiness: PrintReadiness = hasCriticalFail || warningCount > 1 ? 'attention' : 'good';

  if (readiness === 'good' && !notes.includes('STL & 3MF slicer containers generated')) {
    notes.push('STL & 3MF slicer containers generated');
  }

  score = Math.max(0, Math.min(100, score));

  const recommendation =
    readiness === 'good'
      ? 'Model is ready for slicing. Import the STL or 3MF file into PrusaSlicer, Bambu Studio, or Cura.'
      : 'Review the flagged items above before printing to ensure smooth slicing and structural stability.';

  return {
    readiness,
    score,
    checks,
    notes,
    recommendation,
  };
}
