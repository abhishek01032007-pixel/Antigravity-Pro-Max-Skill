/**
 * UpdateManifestClient.js - Remote Release Discovery and Manifest Validation Client
 *
 * Discovers latest GitHub release, locates release-manifest.json asset,
 * and performs strict schema, product, channel, platform, and hash validation.
 */

const { UpdateHttpClient } = require('./UpdateHttpClient');
const { validateTrustedUrl, sanitizeFilename } = require('./TrustedUrlPolicy');
const SemVer = require('./SemVer');

const GITHUB_REPO = 'abhishek01032007-pixel/Nexora-Skills-Manager';
const DEFAULT_LATEST_RELEASE_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const MANIFEST_ASSET_NAME = 'release-manifest.json';

const MAX_DESKTOP_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const MAX_RUNTIME_SIZE_BYTES = 500 * 1024 * 1024;       // 500 MB
const SHA256_HEX_REGEX = /^[0-9a-fA-F]{64}$/;

class UpdateManifestClient {
  constructor(options = {}) {
    this.httpClient = options.httpClient || new UpdateHttpClient(options);
    this.releaseUrl = options.releaseUrl || DEFAULT_LATEST_RELEASE_URL;
  }

  /**
   * Fetches latest release metadata and downloads release-manifest.json.
   */
  async fetchLatestManifest(options = {}) {
    const targetUrl = options.releaseUrl || this.releaseUrl;

    // 1. Fetch GitHub Release metadata
    const releaseData = await this.httpClient.fetchJson(targetUrl, options);

    if (!releaseData || typeof releaseData !== 'object') {
      const err = new Error('Invalid release metadata returned by server');
      err.code = 'UPDATE_MANIFEST_INVALID';
      throw err;
    }

    // 2. Exact asset discovery for release-manifest.json
    if (!Array.isArray(releaseData.assets)) {
      const err = new Error("Release payload missing 'assets' array");
      err.code = 'UPDATE_MANIFEST_INVALID';
      throw err;
    }

    const manifestAsset = releaseData.assets.find(
      (a) => a && a.name && a.name.toLowerCase() === MANIFEST_ASSET_NAME.toLowerCase()
    );

    if (!manifestAsset || !manifestAsset.browser_download_url) {
      const err = new Error(`Required asset '${MANIFEST_ASSET_NAME}' not found in release assets`);
      err.code = 'UPDATE_MANIFEST_INVALID';
      throw err;
    }

    // 3. Download and parse release-manifest.json
    const manifestJson = await this.httpClient.fetchJson(manifestAsset.browser_download_url, options);

    // 4. Validate manifest schema
    return this.validateManifest(manifestJson, options);
  }

  /**
   * Validates manifest object against Schema v1 and security rules.
   */
  validateManifest(manifest, options = {}) {
    if (!manifest || typeof manifest !== 'object') {
      const err = new Error('Manifest is not a valid object');
      err.code = 'UPDATE_MANIFEST_INVALID';
      throw err;
    }

    // 1. Schema Version Check
    const schemaVersion = parseInt(manifest.schemaVersion, 10);
    if (isNaN(schemaVersion) || schemaVersion !== 1) {
      const err = new Error(`Unsupported manifest schema version '${manifest.schemaVersion}'. Expected 1.`);
      err.code = 'UPDATE_MANIFEST_UNSUPPORTED';
      throw err;
    }

    // 2. Product Name Check
    if (!manifest.product || typeof manifest.product !== 'string' || manifest.product.trim() !== 'Nexora Skills Manager') {
      const err = new Error(`Invalid manifest product '${manifest.product}'. Expected 'Nexora Skills Manager'.`);
      err.code = 'UPDATE_MANIFEST_INVALID';
      throw err;
    }

    // 3. Version String Check
    if (!manifest.version || !SemVer.isValid(manifest.version)) {
      const err = new Error(`Invalid SemVer in manifest: '${manifest.version}'`);
      err.code = 'UPDATE_VERSION_INVALID';
      throw err;
    }

    // 4. Channel Validation (Phase 8.2 active: "stable")
    const channel = (manifest.channel || 'stable').toLowerCase();
    if (channel !== 'stable') {
      const err = new Error(`Unsupported release channel '${manifest.channel}'. Active channel is 'stable'.`);
      err.code = 'UPDATE_MANIFEST_INVALID';
      throw err;
    }

    // 5. Minimum Supported Version Validation
    if (manifest.minimumSupportedVersion && !SemVer.isValid(manifest.minimumSupportedVersion)) {
      const err = new Error(`Invalid minimumSupportedVersion in manifest: '${manifest.minimumSupportedVersion}'`);
      err.code = 'UPDATE_VERSION_INVALID';
      throw err;
    }

    // 6. Desktop Descriptor Validation
    if (!manifest.desktop || typeof manifest.desktop !== 'object') {
      const err = new Error("Manifest missing 'desktop' artifact descriptor");
      err.code = 'UPDATE_MANIFEST_INVALID';
      throw err;
    }
    this._validateArtifactDescriptor(manifest.desktop, 'desktop', MAX_DESKTOP_SIZE_BYTES, options);

    // 7. Runtime Descriptor Validation
    if (!manifest.runtime || typeof manifest.runtime !== 'object') {
      const err = new Error("Manifest missing 'runtime' artifact descriptor");
      err.code = 'UPDATE_MANIFEST_INVALID';
      throw err;
    }
    this._validateArtifactDescriptor(manifest.runtime, 'runtime', MAX_RUNTIME_SIZE_BYTES, options);

    // 8. Release Notes URL Check
    if (manifest.releaseNotesUrl) {
      const urlCheck = validateTrustedUrl(manifest.releaseNotesUrl, options.urlPolicyOptions);
      if (!urlCheck.valid) {
        const err = new Error(`Invalid release notes URL: ${urlCheck.reason}`);
        err.code = 'UPDATE_MANIFEST_INVALID';
        throw err;
      }
    }

    return {
      schemaVersion: 1,
      product: 'Nexora Skills Manager',
      version: manifest.version.trim(),
      channel: 'stable',
      minimumSupportedVersion: manifest.minimumSupportedVersion ? manifest.minimumSupportedVersion.trim() : null,
      publishedAt: manifest.publishedAt || (manifest.createdAt || new Date().toISOString()),
      releaseNotesUrl: manifest.releaseNotesUrl || null,
      desktop: {
        file: manifest.desktop.file,
        url: manifest.desktop.url,
        sha256: manifest.desktop.sha256.toLowerCase(),
        size: parseInt(manifest.desktop.size, 10),
        platform: manifest.desktop.platform || 'win32',
        arch: manifest.desktop.arch || 'x64'
      },
      runtime: {
        file: manifest.runtime.file,
        url: manifest.runtime.url,
        sha256: manifest.runtime.sha256.toLowerCase(),
        size: parseInt(manifest.runtime.size, 10),
        platform: manifest.runtime.platform || 'win32',
        arch: manifest.runtime.arch || 'x64'
      }
    };
  }

  /**
   * Internal validator for desktop/runtime artifact objects.
   */
  _validateArtifactDescriptor(descriptor, typeName, maxBytes, options = {}) {
    // A. Filename sanitization
    const fileSan = sanitizeFilename(descriptor.file, '.zip');
    if (!fileSan.valid) {
      const err = new Error(`Invalid ${typeName} filename: ${fileSan.reason}`);
      err.code = 'UPDATE_MANIFEST_INVALID';
      throw err;
    }

    // B. URL validation
    const urlCheck = validateTrustedUrl(descriptor.url, options.urlPolicyOptions);
    if (!urlCheck.valid) {
      const err = new Error(`Invalid ${typeName} download URL: ${urlCheck.reason}`);
      err.code = 'UPDATE_MANIFEST_INVALID';
      throw err;
    }

    // C. SHA-256 hash format check
    if (!descriptor.sha256 || typeof descriptor.sha256 !== 'string' || !SHA256_HEX_REGEX.test(descriptor.sha256.trim())) {
      const err = new Error(`Invalid ${typeName} SHA-256 checksum format in manifest`);
      err.code = 'UPDATE_MANIFEST_INVALID';
      throw err;
    }

    // D. Size check
    const size = parseInt(descriptor.size, 10);
    if (isNaN(size) || size <= 0 || size > maxBytes) {
      const err = new Error(`Invalid ${typeName} size '${descriptor.size}'. Must be between 1 and ${maxBytes} bytes.`);
      err.code = 'UPDATE_ARTIFACT_SIZE_MISMATCH';
      throw err;
    }

    // E. Platform check (win32 required)
    const platform = (descriptor.platform || 'win32').toLowerCase();
    if (platform !== 'win32') {
      const err = new Error(`Incompatible platform '${descriptor.platform}'. Expected 'win32'.`);
      err.code = 'UPDATE_PLATFORM_UNSUPPORTED';
      throw err;
    }

    // F. Architecture check (x64 required)
    const arch = (descriptor.arch || 'x64').toLowerCase();
    if (arch !== 'x64') {
      const err = new Error(`Incompatible architecture '${descriptor.arch}'. Expected 'x64'.`);
      err.code = 'UPDATE_PLATFORM_UNSUPPORTED';
      throw err;
    }
  }
}

module.exports = {
  UpdateManifestClient,
  GITHUB_REPO,
  DEFAULT_LATEST_RELEASE_URL,
  MANIFEST_ASSET_NAME,
  MAX_DESKTOP_SIZE_BYTES,
  MAX_RUNTIME_SIZE_BYTES
};
