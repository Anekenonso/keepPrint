import { describe, it, expect } from 'vitest';
import {
  validateImageFile,
  validatePrompt,
  validateGenerationInput,
  MAX_IMAGE_SIZE_BYTES,
} from '../src/lib/validation';
import type { GenerationInput } from '../src/lib/types';

describe('TS-01: Input Validation', () => {
  describe('Image File Validation', () => {
    it('accepts valid JPEG, PNG, and WebP images within size limits', () => {
      const validJpeg = { name: 'heirloom.jpg', size: 2 * 1024 * 1024, type: 'image/jpeg' };
      const validPng = { name: 'heirloom.png', size: 5 * 1024 * 1024, type: 'image/png' };
      const validWebp = { name: 'heirloom.webp', size: 1 * 1024 * 1024, type: 'image/webp' };

      expect(validateImageFile(validJpeg).success).toBe(true);
      expect(validateImageFile(validPng).success).toBe(true);
      expect(validateImageFile(validWebp).success).toBe(true);
    });

    it('rejects oversized images such as 20 MB (B-01)', () => {
      const oversizedImage = {
        name: 'large_heirloom.jpg',
        size: 20 * 1024 * 1024, // 20 MB
        type: 'image/jpeg',
      };

      const result = validateImageFile(oversizedImage);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('under 10MB');
      }

      // Exact boundary test
      const boundaryImage = {
        name: 'boundary.jpg',
        size: MAX_IMAGE_SIZE_BYTES + 1,
        type: 'image/jpeg',
      };
      expect(validateImageFile(boundaryImage).success).toBe(false);
    });

    it('rejects unsupported file mime types', () => {
      const pdfFile = { name: 'document.pdf', size: 1024, type: 'application/pdf' };
      const gifFile = { name: 'animation.gif', size: 1024, type: 'image/gif' };

      const pdfResult = validateImageFile(pdfFile);
      expect(pdfResult.success).toBe(false);
      if (!pdfResult.success) {
        expect(pdfResult.error).toContain('JPEG, PNG, or WebP');
      }

      const gifResult = validateImageFile(gifFile);
      expect(gifResult.success).toBe(false);
      if (!gifResult.success) {
        expect(gifResult.error).toContain('JPEG, PNG, or WebP');
      }
    });

    it('rejects empty file name', () => {
      const invalid = { name: '', size: 1024, type: 'image/jpeg' };
      const result = validateImageFile(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Prompt Validation', () => {
    it('accepts clear text descriptions of heirlooms', () => {
      const prompt = 'Hand-carved wooden stool with curved seat and tribal geometric engravings.';
      const result = validatePrompt(prompt);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(prompt);
      }
    });

    it('rejects empty or whitespace-only prompts (B-02)', () => {
      expect(validatePrompt('').success).toBe(false);
      expect(validatePrompt('   ').success).toBe(false);
      expect(validatePrompt('ab').success).toBe(false); // under 3 chars
    });

    it('rejects descriptions exceeding 1000 characters', () => {
      const longPrompt = 'a'.repeat(1001);
      const result = validatePrompt(longPrompt);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('1000 characters');
      }
    });
  });

  describe('Generation Input Validation', () => {
    it('accepts valid image-based input', () => {
      const input: GenerationInput = {
        sourceType: 'image',
        images: [{ name: 'carving.jpg', size: 1024 * 500, type: 'image/jpeg' }],
      };

      const result = validateGenerationInput(input);
      expect(result.success).toBe(true);
    });

    it('accepts valid text-based input', () => {
      const input: GenerationInput = {
        sourceType: 'text',
        prompt: '19th century bronze ceremonial bell',
      };

      const result = validateGenerationInput(input);
      expect(result.success).toBe(true);
    });

    it('rejects empty prompt and no images (B-02)', () => {
      const input: GenerationInput = {
        sourceType: 'text',
        prompt: '',
        images: [],
      };

      const result = validateGenerationInput(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(
          result.errors.some(
            (msg) =>
              msg.includes('provide either a photo or a description') ||
              msg.includes('clear description')
          )
        ).toBe(true);
      }
    });

    it('rejects image source type when no images are provided', () => {
      const input: GenerationInput = {
        sourceType: 'image',
        images: [],
      };

      const result = validateGenerationInput(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((msg) => msg.includes('at least one photo'))).toBe(true);
      }
    });

    it('rejects input with more than 4 images', () => {
      const images = Array.from({ length: 5 }, (_, i) => ({
        name: `photo-${i}.jpg`,
        size: 1000,
        type: 'image/jpeg',
      }));

      const input: GenerationInput = {
        sourceType: 'image',
        images,
      };

      const result = validateGenerationInput(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((msg) => msg.includes('at most 4 photos'))).toBe(true);
      }
    });
  });
});
