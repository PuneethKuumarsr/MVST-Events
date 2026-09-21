const API_ORIGIN = 'https://mvst-events.onrender.com';
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function jsonResponse(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export function createPortalWorker({ fetchUpstream = fetch, timeoutMs = 55000 } = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (!url.pathname.startsWith('/api/') && url.pathname !== '/api') {
        return env.ASSETS.fetch(request);
      }

      if (url.pathname === '/api/portal-health' && request.method === 'GET') {
        return jsonResponse({ status: 'ok', app: 'MVST Seva', hosting: 'Cloudflare Pages' });
      }

      // A new visitor can see the login form without waiting for the data service.
      // An existing cookie must still be verified by the original authentication service.
      const hasSession = /(?:^|;\s*)mvst_session=[^;\s]+/.test(request.headers.get('Cookie') || '');
      if (url.pathname === '/api/auth/me' && request.method === 'GET' && !hasSession) {
        return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
      }

      const origin = request.headers.get('Origin');
      if (WRITE_METHODS.has(request.method) && origin && origin !== url.origin) {
        return jsonResponse({ ok: false, error: 'Please submit from the MVST portal.' }, 403);
      }

      const headers = new Headers(request.headers);
      for (const name of ['Host', 'Connection', 'Content-Length', 'Transfer-Encoding']) {
        headers.delete(name);
      }
      headers.set('X-Forwarded-Host', url.host);
      headers.set('X-Forwarded-Proto', 'https');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        // Concatenating to a fixed origin also keeps paths beginning with // on our backend.
        const upstream = await fetchUpstream(`${API_ORIGIN}${url.pathname}${url.search}`, {
          method: request.method,
          headers,
          body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
          redirect: 'manual',
          signal: controller.signal,
          cf: { cacheTtl: 0, cacheEverything: false },
        });

        const contentType = upstream.headers.get('Content-Type') || '';
        if (contentType.includes('text/html')) {
          return jsonResponse({
            ok: false,
            error: 'The MVST records service is starting. Please try again shortly.',
          }, 503);
        }

        const responseHeaders = new Headers(upstream.headers);
        responseHeaders.set('Cache-Control', 'private, no-store');
        responseHeaders.delete('Access-Control-Allow-Origin');
        responseHeaders.delete('Access-Control-Allow-Credentials');
        responseHeaders.delete('Connection');
        responseHeaders.delete('Transfer-Encoding');

        // Sessions stay HttpOnly and host-only on mvst-seva.pages.dev.
        const cookies = upstream.headers.getSetCookie();
        responseHeaders.delete('Set-Cookie');
        for (const cookie of cookies) {
          responseHeaders.append('Set-Cookie', cookie.replace(/;\s*Domain=[^;]*/ig, ''));
        }
        const location = responseHeaders.get('Location');
        if (location) {
          const destination = new URL(location, API_ORIGIN);
          if (destination.origin === API_ORIGIN) {
            responseHeaders.set('Location', `${url.origin}${destination.pathname}${destination.search}${destination.hash}`);
          }
        }
        return new Response(upstream.body, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: responseHeaders,
        });
      } catch {
        return jsonResponse({
          ok: false,
          error: 'The MVST records service is temporarily unavailable. Please try again shortly.',
        }, 503);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export default createPortalWorker();
