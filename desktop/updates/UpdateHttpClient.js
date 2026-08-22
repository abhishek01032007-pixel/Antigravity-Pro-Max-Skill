/**
 * UpdateHttpClient.js - Secure HTTPS Transport Client for Update Operations
 *
 * Implements strict timeouts, size limits, redirect validation, and error normalization.
 * Supports dependency injection for offline testing.
 */

const https = require('https');
const http = require('http');
const { validateTrustedUrl, validateRedirect } = require('./TrustedUrlPolicy');

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_SIZE_BYTES = 1048576; // 1 MB

const crypto = require('crypto');
const fs = require('fs');

const DEFAULT_CONNECT_TIMEOUT_MS = 15000;
const DEFAULT_INACTIVITY_TIMEOUT_MS = 30000;

class UpdateHttpClient {
  constructor(options = {}) {
    this.defaultTimeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.defaultMaxSizeBytes = options.maxSizeBytes || DEFAULT_MAX_SIZE_BYTES;
    this.customTransport = options.customTransport || null;
    this.urlPolicyOptions = options.urlPolicyOptions || {};
  }

  /**
   * Fetches JSON from a remote HTTPS endpoint with security validations.
   */
  async fetchJson(urlString, requestOptions = {}) {
    const raw = await this.fetchText(urlString, requestOptions);
    try {
      return JSON.parse(raw);
    } catch {
      const err = new Error('Failed to parse remote response as JSON');
      err.code = 'UPDATE_MANIFEST_INVALID';
      throw err;
    }
  }

  /**
   * Fetches raw text from a remote endpoint.
   */
  async fetchText(urlString, requestOptions = {}) {
    const buffer = await this.fetchBuffer(urlString, requestOptions);
    return buffer.toString('utf8');
  }

  /**
   * Streams a remote file to a destination path while computing SHA-256 in real time.
   * Supports progress callbacks, exact size checks, hard caps, and cancellation signals.
   */
  downloadToFile(urlString, destinationPath, requestOptions = {}, redirectCount = 0) {
    if (this.customTransport && typeof this.customTransport.downloadToFile === 'function') {
      return this.customTransport.downloadToFile(urlString, destinationPath, requestOptions, redirectCount);
    }

    return new Promise((resolve, reject) => {
      const policy = validateTrustedUrl(urlString, this.urlPolicyOptions);
      if (!policy.valid) {
        const err = new Error(policy.reason);
        err.code = 'UPDATE_REMOTE_ERROR';
        err.details = policy;
        return reject(err);
      }

      const signal = requestOptions.signal || null;
      if (signal && signal.aborted) {
        const err = new Error('Download aborted before request started');
        err.code = 'UPDATE_DOWNLOAD_CANCELLED';
        return reject(err);
      }

      const connectTimeoutMs = requestOptions.connectTimeoutMs || DEFAULT_CONNECT_TIMEOUT_MS;
      const inactivityTimeoutMs = requestOptions.inactivityTimeoutMs || DEFAULT_INACTIVITY_TIMEOUT_MS;
      const maxSizeBytes = requestOptions.maxSizeBytes || (2 * 1024 * 1024 * 1024);
      const expectedSizeBytes = requestOptions.expectedSizeBytes || null;

      const parsed = new URL(policy.url);
      const reqOptions = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'NexoraSkillsManager/1.0.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/octet-stream, application/zip, */*',
          ...(requestOptions.headers || {})
        },
        timeout: connectTimeoutMs
      };

      const protocolModule = parsed.protocol === 'https:' ? https : http;
      const hash = crypto.createHash('sha256');
      let fileStream = null;
      let settled = false;
      let inactivityTimer = null;

      const resetInactivityTimer = (req) => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
          const err = new Error(`Download stream inactive for > ${inactivityTimeoutMs}ms`);
          err.code = 'UPDATE_TIMEOUT';
          cleanupAndReject(err, req);
        }, inactivityTimeoutMs);
      };

      const cleanupAndReject = (err, req = null) => {
        if (settled) return;
        settled = true;

        if (inactivityTimer) clearTimeout(inactivityTimer);
        if (req) {
          try { req.destroy(); } catch {}
        }
        if (fileStream) {
          try {
            fileStream.destroy();
            if (fs.existsSync(destinationPath)) {
              fs.unlinkSync(destinationPath);
            }
          } catch {}
        }

        reject(err);
      };

      const req = protocolModule.request(reqOptions, (res) => {
        // Handle Redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          if (inactivityTimer) clearTimeout(inactivityTimer);
          const redirectCheck = validateRedirect(urlString, res.headers.location, redirectCount, this.urlPolicyOptions);
          if (!redirectCheck.valid) {
            const err = new Error(`Redirect rejected: ${redirectCheck.reason}`);
            err.code = 'UPDATE_REMOTE_ERROR';
            return cleanupAndReject(err, req);
          }

          res.resume();
          return resolve(this.downloadToFile(redirectCheck.resolvedUrl, destinationPath, requestOptions, redirectCheck.redirectCount));
        }

        // Handle HTTP Errors
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const err = new Error(`Remote HTTP error ${res.statusCode} ${res.statusMessage || ''}`.trim());
          err.code = 'UPDATE_REMOTE_ERROR';
          err.statusCode = res.statusCode;
          res.resume();
          return cleanupAndReject(err, req);
        }

        const contentLength = parseInt(res.headers['content-length'], 10);
        if (!isNaN(contentLength)) {
          if (expectedSizeBytes !== null && contentLength !== expectedSizeBytes) {
            const err = new Error(`Content-Length (${contentLength} bytes) does not match expected size (${expectedSizeBytes} bytes)`);
            err.code = 'UPDATE_ARTIFACT_SIZE_MISMATCH';
            res.resume();
            return cleanupAndReject(err, req);
          }
          if (contentLength > maxSizeBytes) {
            const err = new Error(`Content-Length (${contentLength} bytes) exceeds maximum allowable limit (${maxSizeBytes} bytes)`);
            err.code = 'UPDATE_ARTIFACT_SIZE_MISMATCH';
            res.resume();
            return cleanupAndReject(err, req);
          }
        }

        // Create write stream
        try {
          fileStream = fs.createWriteStream(destinationPath);
        } catch (err) {
          const writeErr = new Error(`Failed to create destination file: ${err.message}`);
          writeErr.code = 'UPDATE_DOWNLOAD_FAILED';
          return cleanupAndReject(writeErr, req);
        }

        let totalReceived = 0;
        const totalExpected = !isNaN(contentLength) ? contentLength : (expectedSizeBytes || null);

        resetInactivityTimer(req);

        res.on('data', (chunk) => {
          resetInactivityTimer(req);
          totalReceived += chunk.length;

          if (totalReceived > maxSizeBytes) {
            const err = new Error(`Stream exceeded maximum allowable size of ${maxSizeBytes} bytes`);
            err.code = 'UPDATE_ARTIFACT_SIZE_MISMATCH';
            return cleanupAndReject(err, req);
          }

          if (expectedSizeBytes !== null && totalReceived > expectedSizeBytes) {
            const err = new Error(`Stream exceeded manifest expected size of ${expectedSizeBytes} bytes`);
            err.code = 'UPDATE_ARTIFACT_SIZE_MISMATCH';
            return cleanupAndReject(err, req);
          }

          hash.update(chunk);

          if (requestOptions.onProgress && typeof requestOptions.onProgress === 'function') {
            const percent = totalExpected ? Math.min(100, Math.round((totalReceived / totalExpected) * 1000) / 10) : null;
            requestOptions.onProgress({
              bytesReceived: totalReceived,
              totalBytes: totalExpected,
              percent
            });
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          if (settled) return;
          settled = true;
          if (inactivityTimer) clearTimeout(inactivityTimer);

          if (expectedSizeBytes !== null && totalReceived !== expectedSizeBytes) {
            try { if (fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath); } catch {}
            const err = new Error(`Downloaded size (${totalReceived} bytes) does not match expected size (${expectedSizeBytes} bytes)`);
            err.code = 'UPDATE_ARTIFACT_SIZE_MISMATCH';
            return reject(err);
          }

          const calculatedSha256 = hash.digest('hex').toLowerCase();
          resolve({
            bytesReceived: totalReceived,
            sha256: calculatedSha256,
            destinationPath
          });
        });

        fileStream.on('error', (err) => {
          const mapErr = new Error(`File write error: ${err.message}`);
          mapErr.code = 'UPDATE_DOWNLOAD_FAILED';
          cleanupAndReject(mapErr, req);
        });

        res.on('error', (err) => {
          const mapErr = new Error(`Download stream error: ${err.message}`);
          mapErr.code = 'UPDATE_DOWNLOAD_FAILED';
          cleanupAndReject(mapErr, req);
        });
      });

      // Handle signal cancellation
      if (signal) {
        signal.addEventListener('abort', () => {
          const err = new Error('Download cancelled by user');
          err.code = 'UPDATE_DOWNLOAD_CANCELLED';
          cleanupAndReject(err, req);
        });
      }

      req.on('timeout', () => {
        const err = new Error(`Connection timed out after ${connectTimeoutMs}ms`);
        err.code = 'UPDATE_TIMEOUT';
        cleanupAndReject(err, req);
      });

      req.on('error', (err) => {
        const mappedErr = new Error(err.message || 'Network transport error');
        if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH') {
          mappedErr.code = 'UPDATE_OFFLINE';
        } else if (err.code === 'ETIMEDOUT') {
          mappedErr.code = 'UPDATE_TIMEOUT';
        } else {
          mappedErr.code = 'UPDATE_DOWNLOAD_FAILED';
        }
        cleanupAndReject(mappedErr, req);
      });

      req.end();
    });
  }

  /**
   * Core buffer fetching method with redirect tracking, size capping, and timeouts.
   */
  fetchBuffer(urlString, requestOptions = {}, redirectCount = 0) {
    if (this.customTransport && typeof this.customTransport.fetchBuffer === 'function') {
      return this.customTransport.fetchBuffer(urlString, requestOptions, redirectCount);
    }

    return new Promise((resolve, reject) => {
      const policy = validateTrustedUrl(urlString, this.urlPolicyOptions);
      if (!policy.valid) {
        const err = new Error(policy.reason);
        err.code = 'UPDATE_REMOTE_ERROR';
        err.details = policy;
        return reject(err);
      }

      const timeoutMs = requestOptions.timeoutMs || this.defaultTimeoutMs;
      const maxSizeBytes = requestOptions.maxSizeBytes || this.defaultMaxSizeBytes;

      const parsed = new URL(policy.url);
      const reqOptions = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'NexoraSkillsManager/1.0.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json, text/plain, */*',
          ...(requestOptions.headers || {})
        },
        timeout: timeoutMs
      };

      const protocolModule = parsed.protocol === 'https:' ? https : http;

      let settled = false;
      const cleanupAndReject = (err) => {
        if (!settled) {
          settled = true;
          req.destroy();
          reject(err);
        }
      };

      const req = protocolModule.request(reqOptions, (res) => {
        // Handle Redirects (301, 302, 307, 308)
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          const redirectCheck = validateRedirect(urlString, res.headers.location, redirectCount, this.urlPolicyOptions);
          if (!redirectCheck.valid) {
            const err = new Error(`Redirect rejected: ${redirectCheck.reason}`);
            err.code = 'UPDATE_REMOTE_ERROR';
            return cleanupAndReject(err);
          }

          res.resume();
          return resolve(this.fetchBuffer(redirectCheck.resolvedUrl, requestOptions, redirectCheck.redirectCount));
        }

        // Handle HTTP Errors
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const err = new Error(`Remote HTTP error ${res.statusCode} ${res.statusMessage || ''}`.trim());
          err.code = 'UPDATE_REMOTE_ERROR';
          err.statusCode = res.statusCode;
          res.resume();
          return cleanupAndReject(err);
        }

        const contentLength = parseInt(res.headers['content-length'], 10);
        if (!isNaN(contentLength) && contentLength > maxSizeBytes) {
          const err = new Error(`Response size (${contentLength} bytes) exceeds limit (${maxSizeBytes} bytes)`);
          err.code = 'UPDATE_MANIFEST_INVALID';
          res.resume();
          return cleanupAndReject(err);
        }

        const chunks = [];
        let totalReceived = 0;

        res.on('data', (chunk) => {
          totalReceived += chunk.length;
          if (totalReceived > maxSizeBytes) {
            const err = new Error(`Response exceeded maximum size limit of ${maxSizeBytes} bytes`);
            err.code = 'UPDATE_MANIFEST_INVALID';
            return cleanupAndReject(err);
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          if (!settled) {
            settled = true;
            resolve(Buffer.concat(chunks));
          }
        });

        res.on('error', (err) => {
          const mappedErr = new Error(err.message || 'Stream error');
          mappedErr.code = 'UPDATE_REMOTE_ERROR';
          cleanupAndReject(mappedErr);
        });
      });

      req.on('timeout', () => {
        const err = new Error(`Request timed out after ${timeoutMs}ms`);
        err.code = 'UPDATE_TIMEOUT';
        cleanupAndReject(err);
      });

      req.on('error', (err) => {
        const mappedErr = new Error(err.message || 'Network transport error');
        if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH') {
          mappedErr.code = 'UPDATE_OFFLINE';
        } else if (err.code === 'ETIMEDOUT') {
          mappedErr.code = 'UPDATE_TIMEOUT';
        } else {
          mappedErr.code = 'UPDATE_REMOTE_ERROR';
        }
        cleanupAndReject(mappedErr);
      });

      req.end();
    });
  }
}

module.exports = {
  UpdateHttpClient,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_SIZE_BYTES,
  DEFAULT_CONNECT_TIMEOUT_MS,
  DEFAULT_INACTIVITY_TIMEOUT_MS
};
