export const config = {
  runtime: 'edge',
};

// Strict SDK path patterns allowed through the edge proxy
const ALLOWED_PATH_PATTERNS = [
  /^\/(global\/)?lux3d\/v1\/generate\/img-to-3d\/task\/create$/,
  /^\/(global\/)?lux3d\/v1\/generate\/text-to-3d\/task\/create$/,
  /^\/(global\/)?lux3d\/v1\/multi-format-export\/task\/create$/,
  /^\/(global\/)?lux3d\/v1\/generate\/task\/get$/,
  /^\/(global\/)?lux3d\/v1\/generate\/task\/list$/,
  /^\/v1\/3d\/generation/,
  /^\/v1\/tasks/,
];

// In-memory sliding-window edge rate limit (60 requests per minute per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(clientIp: string): boolean {
  if (!clientIp) return true;
  const now = Date.now();
  const entry = rateLimitMap.get(clientIp);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 60) {
    return false;
  }
  entry.count++;
  return true;
}

export function isAllowedPath(path: string): boolean {
  return ALLOWED_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

export async function proxyToAholo(
  request: Request,
  targetHost: 'api.aholo.ai' | 'api.aholo.cn',
  basePrefix: string
): Promise<Response> {
  const method = request.method.toUpperCase();

  // 1. Enforce allowed HTTP methods
  if (method !== 'GET' && method !== 'POST' && method !== 'OPTIONS') {
    return new Response(JSON.stringify({ error: `Method ${method} not allowed.` }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        Allow: 'GET, POST, OPTIONS',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // 2. Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // 3. Rate limiting check per client IP
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous';

  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests. Please wait a minute before making more generation calls.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // 4. Validate server-side API key
  const apiKey = typeof process !== 'undefined' && process.env ? process.env.AHOLO_API_KEY : '';
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server proxy misconfigured: AHOLO_API_KEY is not set.' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // 5. Construct & validate upstream target URL
  const url = new URL(request.url);
  const targetPath = url.pathname.replace(new RegExp(`^${basePrefix}`), '');

  if (!isAllowedPath(targetPath)) {
    return new Response(
      JSON.stringify({
        error: `Forbidden: Path '${targetPath}' is not an authorized Lux3D route.`,
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  const targetUrl = `https://${targetHost}${targetPath}${url.search}`;

  // 6. Sanitize and prepare headers for upstream
  const forwardHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lowerKey = key.toLowerCase();
    // Strip host, authorization, and hop-by-hop headers
    if (
      lowerKey !== 'host' &&
      lowerKey !== 'authorization' &&
      lowerKey !== 'content-length' &&
      lowerKey !== 'connection'
    ) {
      forwardHeaders.set(key, value);
    }
  }

  // Inject secure server-side API key
  forwardHeaders.set('Authorization', `Bearer ${apiKey}`);

  // 7. Buffer body for POST payloads
  const body = method === 'POST' ? await request.arrayBuffer() : undefined;

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body,
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upstream error';
    return new Response(JSON.stringify({ error: `Upstream connection failed: ${message}` }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
