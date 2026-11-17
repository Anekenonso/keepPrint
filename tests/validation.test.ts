import { describe, it, expect } from 'vitest';
import {
  validateImageFile,
  validatePrompt,
  validateGenerationInput,
  checkPrintReadiness,
  modelPrintMetadataSchema,
  MAX_IMAGE_SIZE_BYTES,
} from '../src/lib/validation';
import type { GenerationInput, ModelPrintMetadata } from '../src/lib/types';

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

    it('accepts qualityMode turbo and ultra', () => {
      const turboInput: GenerationInput = {
        sourceType: 'text',
        prompt: 'Ceremonial vessel',
        qualityMode: 'turbo',
      };
      expect(validateGenerationInput(turboInput).success).toBe(true);

      const ultraInput: GenerationInput = {
        sourceType: 'text',
        prompt: 'Ceremonial vessel',
        qualityMode: 'ultra',
      };
      expect(validateGenerationInput(ultraInput).success).toBe(true);
    });
  });
});

describe('T-13 / R-07: Print-Readiness Checks', () => {
  describe('File Format Presence', () => {
    it('rates readiness as "good" when STL is available', () => {
      const metadata: ModelPrintMetadata = {
        hasStl: true,
        hasThreeMf: false,
        hasGlb: true,
        faceCount: 80000,
      };

      const report = checkPrintReadiness(metadata);
      expect(report.readiness).toBe('good');
      expect(report.score).toBeGreaterThanOrEqual(90);
      expect(report.checks.find((c) => c.id === 'file-presence')?.passed).toBe(true);
      expect(report.notes).toContain('Slicer-ready for FDM and Resin 3D printers');
    });

    it('rates readiness as "good" when 3MF is available', () => {
      const metadata: ModelPrintMetadata = {
        hasStl: false,
        hasThreeMf: true,
        hasGlb: true,
        faceCount: 80000,
      };

      const report = checkPrintReadiness(metadata);
      expect(report.readiness).toBe('good');
      expect(report.checks.find((c) => c.id === 'file-presence')?.passed).toBe(true);
    });

    it('rates readiness as "attention" when neither STL nor 3MF is present', () => {
      const metadata: ModelPrintMetadata = {
        hasStl: false,
        hasThreeMf: false,
        hasGlb: true,
      };

      const report = checkPrintReadiness(metadata);
      expect(report.readiness).toBe('attention');
      expect(report.checks.find((c) => c.id === 'file-presence')?.passed).toBe(false);
      expect(report.checks.find((c) => c.id === 'file-presence')?.status).toBe('fail');
      expect(report.notes).toContain('Missing STL or 3MF slice file');
    });
  });

  describe('File Size Integrity Checks', () => {
    it('fails file-size integrity when file is smaller than 100 bytes', () => {
      const metadata: ModelPrintMetadata = {
        hasStl: true,
        hasThreeMf: true,
        fileSizeBytes: 42, // Under MIN_PRINTABLE_FILE_SIZE_BYTES
      };

      const report = checkPrintReadiness(metadata);
      expect(report.readiness).toBe('attention');
      const sizeCheck = report.checks.find((c) => c.id === 'file-size');
      expect(sizeCheck?.passed).toBe(false);
      expect(sizeCheck?.status).toBe('fail');
      expect(report.notes).toContain('Export file appears corrupted or empty');
    });

    it('warns when file size exceeds 150 MB', () => {
      const metadata: ModelPrintMetadata = {
        hasStl: true,
        hasThreeMf: false,
        fileSizeBytes: 180 * 1024 * 1024, // 180 MB
        faceCount: 80000,
      };

      const report = checkPrintReadiness(metadata);
      const sizeCheck = report.checks.find((c) => c.id === 'file-size');
      expect(sizeCheck?.status).toBe('warning');
      expect(report.notes).toContain('Large file size; ensure slicer has sufficient memory');
    });

    it('passes when file size is in normal range', () => {
      const metadata: ModelPrintMetadata = {
        hasStl: true,
        hasThreeMf: true,
        fileSizeBytes: 8 * 1024 * 1024, // 8 MB
        faceCount: 80000,
      };

      const report = checkPrintReadiness(metadata);
      expect(report.readiness).toBe('good');
      const sizeCheck = report.checks.find((c) => c.id === 'file-size');
      expect(sizeCheck?.passed).toBe(true);
      expect(sizeCheck?.status).toBe('pass');
    });
  });

  describe('Mesh Density Checks', () => {
    it('passes optimal mesh density check with 80k retopo faces', () => {
      const metadata: ModelPrintMetadata = {
        hasStl: true,
        hasThreeMf: true,
        faceCount: 80000,
      };

      const report = checkPrintReadiness(metadata);
      expect(report.readiness).toBe('good');
      const meshCheck = report.checks.find((c) => c.id === 'mesh-density');
      expect(meshCheck?.passed).toBe(true);
      expect(report.notes).toContain('Manifold geometry verified via retopology');
    });

    it('warns on very low face counts (<2,000)', () => {
      const metadata: ModelPrintMetadata = {
        hasStl: true,
        hasThreeMf: false,
        faceCount: 800,
      };

      const report = checkPrintReadiness(metadata);
      const meshCheck = report.checks.find((c) => c.id === 'mesh-density');
      expect(meshCheck?.status).toBe('warning');
      expect(report.notes).toContain('Low polygon density may result in visible facets');
    });

    it('warns on excessive face counts (>200,000)', () => {
      const metadata: ModelPrintMetadata = {
        hasStl: true,
        hasThreeMf: false,
        faceCount: 350000,
      };

      const report = checkPrintReadiness(metadata);
      const meshCheck = report.checks.find((c) => c.id === 'mesh-density');
      expect(meshCheck?.status).toBe('warning');
      expect(report.notes).toContain('High face count; recommend slicer polygon reduction');
    });
  });

  describe('Dimensions & Build Volume Checks', () => {
    it('passes when model dimensions fit standard build volume', () => {
      const metadata: ModelPrintMetadata = {
        hasStl: true,
        hasThreeMf: true,
        dimensionsMm: { width: 75, depth: 75, height: 110 },
      };

      const report = checkPrintReadiness(metadata);
      expect(report.readiness).toBe('good');
      const dimCheck = report.checks.find((c) => c.id === 'dimensions');
      expect(dimCheck?.passed).toBe(true);
      expect(report.notes).toContain('Fits standard 3D printer build volume');
    });

    it('warns when model features are dangerously thin (<2mm)', () => {
      const metadata: ModelPrintMetadata = {
        hasStl: true,
        hasThreeMf: true,
        dimensionsMm: { width: 50, depth: 50, height: 1.2 },
      };

      const report = checkPrintReadiness(metadata);
      const dimCheck = report.checks.find((c) => c.id === 'dimensions');
      expect(dimCheck?.status).toBe('warning');
      expect(report.notes).toContain(
        'Thin features detected; check slicer preview for wall continuity'
      );
    });

    it('warns when model exceeds standard 250mm print bed', () => {
      const metadata: ModelPrintMetadata = {
        hasStl: true,
        hasThreeMf: true,
        dimensionsMm: { width: 320, depth: 150, height: 100 },
      };

      const report = checkPrintReadiness(metadata);
      const dimCheck = report.checks.find((c) => c.id === 'dimensions');
      expect(dimCheck?.status).toBe('warning');
      expect(report.notes).toContain('Model exceeds standard 250mm bed; scale down in slicer');
    });
  });

  describe('Metadata Schema Validation', () => {
    it('validates correct metadata schema', () => {
      const valid = {
        hasStl: true,
        hasThreeMf: true,
        fileSizeBytes: 1024 * 1024,
        faceCount: 50000,
        dimensionsMm: { width: 60, depth: 60, height: 90 },
      };

      const parsed = modelPrintMetadataSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('rejects negative sizes or dimensions in schema', () => {
      const invalid = {
        hasStl: true,
        hasThreeMf: true,
        fileSizeBytes: -10,
      };

      const parsed = modelPrintMetadataSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });
});
