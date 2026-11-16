export const config = {
  runtime: 'edge',
};

export async function proxyToAholo(
  request: Request,
  targetHost: 'api.aholo.ai' | 'api.aholo.cn',
  basePrefix: string
): Promise<Response> {
  // 1. Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // 2. Validate server-side API key
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

  // 3. Construct upstream target URL
  const url = new URL(request.url);
  const targetPath = url.pathname.replace(new RegExp(`^${basePrefix}`), '');
  const targetUrl = `https://${targetHost}${targetPath}${url.search}`;

  // 4. Sanitize and prepare headers for upstream
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

  // 5. Buffer body for POST/PUT payloads
  const body =
    request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined;

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body,
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
