/* Authenticated, same-origin HTTP client shared by the lab and website admin. */
(function (global) {
  'use strict';

  const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  class HttpError extends Error {
    constructor(message, status = 0, details = null) {
      super(message);
      this.name = 'HttpError';
      this.status = status;
      this.details = details;
    }
  }

  /** Create a client whose CSRF token is read at request time, after login. */
  function createClient({ getCsrfToken = () => '' } = {}) {
    return async function request(path, options = {}) {
      const url = new URL(path, global.location.href);
      if (url.origin !== global.location.origin) {
        throw new HttpError('The application can only request files from this site.');
      }

      const method = (options.method || 'GET').toUpperCase();
      const headers = new Headers(options.headers || {});
      let body = options.body;
      // Keep multipart and other browser body types intact. Only plain data is JSON.
      if (
        body !== null &&
        typeof body === 'object' &&
        (Array.isArray(body) || Object.prototype.toString.call(body) === '[object Object]')
      ) {
        body = JSON.stringify(body);
        if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      }
      if (!headers.has('Accept')) headers.set('Accept', 'application/json');
      const token = getCsrfToken();
      if (token && MUTATING_METHODS.has(method)) headers.set('X-CSRF-Token', token);

      let response;
      try {
        response = await fetch(path, {
          ...options,
          credentials: 'same-origin',
          method,
          headers,
          body,
        });
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new HttpError('Unable to connect. Check your connection and try again.');
      }

      const text = response.status === 204 ? '' : await response.text();
      const contentType = response.headers.get('content-type') || '';
      let data = text;
      if (!text) data = null;
      else if (contentType.includes('json')) {
        try {
          data = JSON.parse(text);
        } catch (_) {
          throw new HttpError(
            'The server returned an invalid response. Please try again.',
            response.status,
          );
        }
      }

      if (!response.ok) {
        const serverMessage = data && typeof data === 'object' && (data.error || data.message);
        const fallback =
          response.status === 401
            ? 'Your session has expired. Please sign in again.'
            : response.status === 403
              ? 'You do not have permission to perform this action.'
              : `The request failed (HTTP ${response.status}). Please try again.`;
        throw new HttpError(
          typeof serverMessage === 'string' ? serverMessage : fallback,
          response.status,
          data,
        );
      }
      return data;
    };
  }

  global.LabHttp = Object.freeze({ createClient, HttpError });
})(window);
