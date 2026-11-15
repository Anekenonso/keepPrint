import { z } from 'zod';
import type { GenerationInput, ImageInputItem } from './types';

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
  .min(MIN_PROMPT_LENGTH, `Description must be at least ${MIN_PROMPT_LENGTH} characters.`)
  .max(MAX_PROMPT_LENGTH, `Description must not exceed ${MAX_PROMPT_LENGTH} characters.`);

export const generationInputSchema = z
  .object({
    sourceType: z.enum(['image', 'text']),
    prompt: z.string().trim().optional(),
    images: z
      .array(imageInputItemSchema)
      .max(MAX_IMAGE_COUNT, `You can upload at most ${MAX_IMAGE_COUNT} photos.`)
      .optional(),
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
