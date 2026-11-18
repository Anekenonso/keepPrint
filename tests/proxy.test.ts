import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { proxyToAholo } from '../api/_proxy';
import globalHandler from '../api/aholo-global';
import cnHandler from '../api/aholo-cn';

describe('Serverless Backend Proxy (api/_proxy.ts)', () => {
  const originalEnv = process.env.AHOLO_API_KEY;

  beforeEach(() => {
    process.env.AHOLO_API_KEY = 'secret-aholo-key-123';
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.AHOLO_API_KEY = originalEnv;
    } else {
      delete process.env.AHOLO_API_KEY;
    }
    vi.restoreAllMocks();
  });

  it('handles CORS OPTIONS preflight request with status 204 and CORS headers', async () => {
    const request = new Request('https://keepprint.vercel.app/api/aholo-global/v1/3d/generation', {
      method: 'OPTIONS',
    });

    const response = await proxyToAholo(request, 'api.aholo.ai', '/api/aholo-global');

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('returns status 500 when AHOLO_API_KEY is not configured on the server', async () => {
    delete process.env.AHOLO_API_KEY;

    const request = new Request('https://keepprint.vercel.app/api/aholo-global/v1/3d/generation', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'test' }),
    });

    const response = await proxyToAholo(request, 'api.aholo.ai', '/api/aholo-global');
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toContain('AHOLO_API_KEY is not set');
  });

  it('attaches secret server-side Authorization header and forwards request to upstream Aholo API', async () => {
    let capturedUrl = '';
    let capturedHeaders: Headers | undefined;
    let capturedMethod = '';

    globalThis.fetch = vi.fn().mockImplementation((url, init) => {
      capturedUrl = url.toString();
      capturedHeaders = new Headers(init.headers);
      capturedMethod = init.method;

      return Promise.resolve(
        new Response(JSON.stringify({ taskId: 99999, status: 'SUCCESS' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const request = new Request(
      'https://keepprint.vercel.app/api/aholo-global/global/lux3d/v1/generate/img-to-3d/task/create',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer client-placeholder',
        },
        body: JSON.stringify({ prompt: 'a carved wooden box' }),
      }
    );

    const response = await globalHandler(request);

    expect(response.status).toBe(200);
    expect(capturedUrl).toBe('https://api.aholo.ai/global/lux3d/v1/generate/img-to-3d/task/create');
    expect(capturedMethod).toBe('POST');
    // Verifies secret key replacement:
    expect(capturedHeaders?.get('Authorization')).toBe('Bearer secret-aholo-key-123');
    // Verifies CORS response header:
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

    const json = await response.json();
    expect(json.taskId).toBe(99999);
  });

  it('routes cn requests to api.aholo.cn via cnHandler', async () => {
    let capturedUrl = '';

    globalThis.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url.toString();
      return Promise.resolve(
        new Response(JSON.stringify({ taskId: 88888, status: 'SUCCESS' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const request = new Request(
      'https://keepprint.vercel.app/api/aholo-cn/lux3d/v1/generate/img-to-3d/task/create',
      {
        method: 'POST',
        body: JSON.stringify({ prompt: 'vase' }),
      }
    );

    const response = await cnHandler(request);
    expect(response.status).toBe(200);
    expect(capturedUrl).toBe('https://api.aholo.cn/lux3d/v1/generate/img-to-3d/task/create');
  });

  it('returns status 502 when upstream fetch rejects', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection timeout'));

    const request = new Request('https://keepprint.vercel.app/api/aholo-global/v1/tasks/12345', {
      method: 'GET',
    });

    const response = await proxyToAholo(request, 'api.aholo.ai', '/api/aholo-global');

    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toContain('Upstream connection failed: Connection timeout');
  });

  it('rejects disallowed HTTP methods with status 405', async () => {
    const request = new Request('https://keepprint.vercel.app/api/aholo-global/v1/3d/generation', {
      method: 'DELETE',
    });

    const response = await proxyToAholo(request, 'api.aholo.ai', '/api/aholo-global');
    expect(response.status).toBe(405);
    const data = await response.json();
    expect(data.error).toContain('Method DELETE not allowed');
  });

  it('rejects unauthorized upstream paths with status 403', async () => {
    const request = new Request(
      'https://keepprint.vercel.app/api/aholo-global/admin/delete-database',
      { method: 'POST', body: JSON.stringify({}) }
    );

    const response = await proxyToAholo(request, 'api.aholo.ai', '/api/aholo-global');
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('Forbidden');
  });
});
