import { describe, it, expect, vi } from 'vitest';
import {
  generate3D,
  createImageTo3dTask,
  createTextTo3dTask,
  pollTask,
  extractModelUrls,
  runRetopology,
  DEFAULT_PRINTABLE_FACE_BUDGET,
} from '../src/lib/lux3d';
import {
  LUX3D_STATUS_SUCCESS,
  LUX3D_STATUS_FAILED,
  LUX3D_STATUS_CANCELED,
  type Lux3dClient,
  type TaskOutput,
} from '@manycore/aholo-sdk-lux3d';
import type { GenerationInput } from '../src/lib/types';

describe('TS-02 & TS-03: Lux3D Client Wrapper', () => {
  describe('extractModelUrls', () => {
    it('correctly maps outputs to glbUrl, stlUrl, threemfUrl, and zipUrl', () => {
      const outputs = [
        { content: 'https://cdn.example.com/assets/model.zip' },
        { content: 'https://cdn.example.com/assets/model.glb' },
        { content: 'https://cdn.example.com/assets/model.stl' },
        { content: 'https://cdn.example.com/assets/model.3mf' },
      ];

      const urls = extractModelUrls(outputs);
      expect(urls.glbUrl).toBe('https://cdn.example.com/assets/model.glb');
      expect(urls.stlUrl).toBe('https://cdn.example.com/assets/model.stl');
      expect(urls.threemfUrl).toBe('https://cdn.example.com/assets/model.3mf');
      expect(urls.zipUrl).toBe('https://cdn.example.com/assets/model.zip');
    });

    it('ignores NOT_REQUESTED or null entries', () => {
      const outputs = [
        { content: 'NOT_REQUESTED' },
        { content: null },
        { content: 'https://cdn.example.com/assets/model.glb' },
      ];

      const urls = extractModelUrls(outputs as unknown as TaskOutput[]);
      expect(urls.glbUrl).toBe('https://cdn.example.com/assets/model.glb');
      expect(urls.stlUrl).toBeUndefined();
    });
  });

  describe('TS-02: Create and Poll Happy Path', () => {
    it('successfully initiates image-to-3d task and returns taskId', async () => {
      const mockClient = {
        imgTo3d: {
          create: vi.fn().mockResolvedValue(12345),
        },
      } as unknown as Lux3dClient;

      const taskId = await createImageTo3dTask(
        { img: 'data:image/jpeg;base64,sample' },
        mockClient
      );
      expect(taskId).toBe(12345);
      expect(mockClient.imgTo3d.create).toHaveBeenCalledWith({
        img: 'data:image/jpeg;base64,sample',
        version: 'G1',
        faceCount: DEFAULT_PRINTABLE_FACE_BUDGET,
      });
    });

    it('successfully initiates text-to-3d task and returns taskId', async () => {
      const mockClient = {
        textTo3d: {
          create: vi.fn().mockResolvedValue(67890),
        },
      } as unknown as Lux3dClient;

      const taskId = await createTextTo3dTask(
        { prompt: 'Traditional brass drinking vessel' },
        mockClient
      );
      expect(taskId).toBe(67890);
      expect(mockClient.textTo3d.create).toHaveBeenCalledWith({
        prompt: 'Traditional brass drinking vessel',
        version: 'G1',
        faceCount: DEFAULT_PRINTABLE_FACE_BUDGET,
      });
    });

    it('polls task and returns expected job shape on success', async () => {
      const mockClient = {
        tasks: {
          waitFor: vi.fn().mockResolvedValue({
            taskId: 12345,
            status: LUX3D_STATUS_SUCCESS,
            outputs: [
              { content: 'https://cdn.example.com/model.zip' },
              { content: 'https://cdn.example.com/model.glb' },
            ],
          }),
        },
      } as unknown as Lux3dClient;

      const result = await pollTask(12345, mockClient);
      expect(result.status).toBe(LUX3D_STATUS_SUCCESS);
      expect(result.outputs).toHaveLength(2);
    });

    it('end-to-end generate3D orchestrates creation, polling, and URL extraction', async () => {
      const mockClient = {
        imgTo3d: {
          create: vi.fn().mockResolvedValue(99999),
        },
        tasks: {
          waitFor: vi.fn().mockResolvedValue({
            taskId: 99999,
            status: LUX3D_STATUS_SUCCESS,
            outputs: [
              { content: 'https://cdn.example.com/heirloom.zip' },
              { content: 'https://cdn.example.com/heirloom.glb' },
            ],
          }),
        },
      } as unknown as Lux3dClient;

      const stages: string[] = [];
      const input: GenerationInput = {
        sourceType: 'image',
        images: [{ name: 'heirloom.jpg', size: 1024, type: 'image/jpeg', dataUrl: 'data:xyz' }],
      };

      const result = await generate3D(input, {
        client: mockClient,
        onProgress: (stage) => stages.push(stage),
      });

      expect(result.taskId).toBe(99999);
      expect(result.status).toBe('succeeded');
      expect(result.glbUrl).toBe('https://cdn.example.com/heirloom.glb');
      expect(stages).toContain('Uploading heirloom photo to Lux3D...');
      expect(stages).toContain('Generating 3D heirloom mesh...');
    });
  });

  describe('TS-04: Retopology Step', () => {
    it('runs retopology with target face budget and returns new model URL', async () => {
      const mockClient = {
        retopology: {
          create: vi.fn().mockResolvedValue(55555),
        },
        tasks: {
          waitFor: vi.fn().mockResolvedValue({
            taskId: 55555,
            status: LUX3D_STATUS_SUCCESS,
            outputs: [{ content: 'https://cdn.example.com/retopo-clean.glb' }],
          }),
        },
      } as unknown as Lux3dClient;

      const result = await runRetopology(
        {
          modelUrl: 'https://cdn.example.com/raw.glb',
          faceBudget: 50000,
        },
        mockClient
      );

      expect(result.taskId).toBe(55555);
      expect(result.retopoGlbUrl).toBe('https://cdn.example.com/retopo-clean.glb');
      expect(
        (mockClient as unknown as { retopology: { create: ReturnType<typeof vi.fn> } }).retopology
          .create
      ).toHaveBeenCalledWith({
        modelUrl: 'https://cdn.example.com/raw.glb',
        faceBudget: 50000,
      });
    });

    it('falls back to default printable face budget when omitted', async () => {
      const mockClient = {
        retopology: {
          create: vi.fn().mockResolvedValue(55556),
        },
        tasks: {
          waitFor: vi.fn().mockResolvedValue({
            taskId: 55556,
            status: LUX3D_STATUS_SUCCESS,
            outputs: [{ content: 'https://cdn.example.com/retopo-default.glb' }],
          }),
        },
      } as unknown as Lux3dClient;

      const result = await runRetopology(
        { modelUrl: 'https://cdn.example.com/raw.glb' },
        mockClient
      );
      expect(result.retopoGlbUrl).toBe('https://cdn.example.com/retopo-default.glb');
      expect(
        (mockClient as unknown as { retopology: { create: ReturnType<typeof vi.fn> } }).retopology
          .create
      ).toHaveBeenCalledWith({
        modelUrl: 'https://cdn.example.com/raw.glb',
        faceBudget: DEFAULT_PRINTABLE_FACE_BUDGET,
      });
    });

    it('handles retopology task failure with clear error', async () => {
      const mockClient = {
        retopology: {
          create: vi.fn().mockResolvedValue(55557),
        },
        tasks: {
          waitFor: vi.fn().mockResolvedValue({
            taskId: 55557,
            status: LUX3D_STATUS_FAILED,
            outputs: [],
          }),
        },
      } as unknown as Lux3dClient;

      await expect(
        runRetopology({ modelUrl: 'https://cdn.example.com/raw.glb' }, mockClient)
      ).rejects.toThrow(/could not be completed/);
    });
  });

  describe('TS-03 & Break Matrix (B-03, B-04): Failure and Error Handling', () => {
    it('handles failed task status with clear user-facing error (B-03)', async () => {
      const mockClient = {
        tasks: {
          waitFor: vi.fn().mockResolvedValue({
            taskId: 12345,
            status: LUX3D_STATUS_FAILED,
            outputs: [],
          }),
        },
      } as unknown as Lux3dClient;

      await expect(pollTask(12345, mockClient)).rejects.toThrow(
        /could not be completed for this heirloom/
      );
    });

    it('handles canceled task status gracefully', async () => {
      const mockClient = {
        tasks: {
          waitFor: vi.fn().mockResolvedValue({
            taskId: 12345,
            status: LUX3D_STATUS_CANCELED,
            outputs: [],
          }),
        },
      } as unknown as Lux3dClient;

      await expect(pollTask(12345, mockClient)).rejects.toThrow(/canceled/);
    });

    it('handles polling timeout with actionable message (B-04)', async () => {
      const timeoutError = new Error('Task polling exceeded timeout limit');
      timeoutError.name = 'PollingTimeoutError';

      const mockClient = {
        tasks: {
          waitFor: vi.fn().mockRejectedValue(timeoutError),
        },
      } as unknown as Lux3dClient;

      await expect(pollTask(12345, mockClient)).rejects.toThrow(
        /timed out while waiting for 3D model/
      );
    });

    it('rejects generate3D when input is invalid without making API calls', async () => {
      const mockClient = {
        imgTo3d: { create: vi.fn() },
        textTo3d: { create: vi.fn() },
      } as unknown as Lux3dClient;

      const invalidInput: GenerationInput = {
        sourceType: 'text',
        prompt: '', // Empty prompt
      };

      await expect(generate3D(invalidInput, { client: mockClient })).rejects.toThrow();
      expect(mockClient.imgTo3d.create).not.toHaveBeenCalled();
      expect(mockClient.textTo3d.create).not.toHaveBeenCalled();
    });
  });
});
