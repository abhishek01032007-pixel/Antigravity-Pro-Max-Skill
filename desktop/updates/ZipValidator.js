/**
 * ZipValidator.js - Pure Node.js Zero-Dependency ZIP Archive Inspector & Validator
 *
 * Implements Central Directory parsing, Zip Slip detection, entry listing,
 * and safe selective small-file extraction using Node's built-in zlib module.
 */

const fs = require('fs');
const zlib = require('zlib');

const EOCD_SIGNATURE = 0x06054b50; // PK\x05\x06
const CD_HEADER_SIGNATURE = 0x02014b50; // PK\x01\x02
const LOCAL_HEADER_SIGNATURE = 0x04034b50; // PK\x03\x04

/**
 * Validates a filename from a ZIP entry against Zip Slip and forbidden characters.
 */
function validateZipEntryPath(entryPath) {
  if (!entryPath || typeof entryPath !== 'string') {
    return { valid: false, reason: 'Empty or invalid entry path', code: 'INVALID_ENTRY_PATH' };
  }

  // Normalize backslashes to forward slashes for checking
  const normalized = entryPath.replace(/\\/g, '/');

  // Check for path traversal
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (seg === '..') {
      return { valid: false, reason: `Path traversal '..' detected in zip entry '${entryPath}'`, code: 'ZIP_SLIP_TRAVERSAL' };
    }
  }

  // Check for absolute or drive-qualified paths
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(entryPath) || entryPath.includes(':')) {
    return { valid: false, reason: `Absolute or drive-qualified path detected in zip entry '${entryPath}'`, code: 'ZIP_SLIP_ABSOLUTE' };
  }

  // Check for control characters or null bytes
  if (/[\0\x01-\x1f]/.test(entryPath)) {
    return { valid: false, reason: `Control character detected in zip entry '${entryPath}'`, code: 'ZIP_SLIP_CONTROL_CHAR' };
  }

  return { valid: true, normalizedPath: normalized };
}

/**
 * Reads and parses the Central Directory of a ZIP file.
 */
function inspectZipFile(filePath) {
  if (!fs.existsSync(filePath)) {
    const err = new Error(`Zip file not found: ${filePath}`);
    err.code = 'UPDATE_ARTIFACT_INVALID';
    throw err;
  }

  const fd = fs.openSync(filePath, 'r');
  try {
    const stat = fs.fstatSync(fd);
    const fileSize = stat.size;

    if (fileSize < 22) {
      const err = new Error('File too small to be a valid ZIP archive');
      err.code = 'UPDATE_ARTIFACT_INVALID';
      throw err;
    }

    // Find End of Central Directory (EOCD) record in the last 65KB
    const searchSize = Math.min(fileSize, 65557);
    const searchBuf = Buffer.alloc(searchSize);
    fs.readSync(fd, searchBuf, 0, searchSize, fileSize - searchSize);

    let eocdOffset = -1;
    for (let i = searchSize - 22; i >= 0; i--) {
      if (searchBuf.readUInt32LE(i) === EOCD_SIGNATURE) {
        eocdOffset = (fileSize - searchSize) + i;
        break;
      }
    }

    if (eocdOffset === -1) {
      const err = new Error('End of Central Directory record not found in archive');
      err.code = 'UPDATE_ARTIFACT_INVALID';
      throw err;
    }

    const eocdBuf = Buffer.alloc(22);
    fs.readSync(fd, eocdBuf, 0, 22, eocdOffset);

    const totalEntries = eocdBuf.readUInt16LE(10);
    const cdSize = eocdBuf.readUInt32LE(12);
    const cdOffset = eocdBuf.readUInt32LE(16);

    if (cdOffset + cdSize > fileSize) {
      const err = new Error('Invalid Central Directory offset or size');
      err.code = 'UPDATE_ARTIFACT_INVALID';
      throw err;
    }

    const cdBuf = Buffer.alloc(cdSize);
    fs.readSync(fd, cdBuf, 0, cdSize, cdOffset);

    const entries = [];
    let pos = 0;

    for (let i = 0; i < totalEntries && pos < cdSize; i++) {
      if (cdBuf.readUInt32LE(pos) !== CD_HEADER_SIGNATURE) {
        const err = new Error('Invalid Central Directory header signature');
        err.code = 'UPDATE_ARTIFACT_INVALID';
        throw err;
      }

      const compressionMethod = cdBuf.readUInt16LE(pos + 10);
      const compressedSize = cdBuf.readUInt32LE(pos + 20);
      const uncompressedSize = cdBuf.readUInt32LE(pos + 24);
      const fileNameLength = cdBuf.readUInt16LE(pos + 28);
      const extraFieldLength = cdBuf.readUInt16LE(pos + 30);
      const fileCommentLength = cdBuf.readUInt16LE(pos + 32);
      const localHeaderOffset = cdBuf.readUInt32LE(pos + 42);

      const fileNameBytes = cdBuf.slice(pos + 46, pos + 46 + fileNameLength);
      const fileName = fileNameBytes.toString('utf8');

      // Security: Validate entry name against Zip Slip
      const pathValidation = validateZipEntryPath(fileName);
      if (!pathValidation.valid) {
        const err = new Error(`Zip Slip protection failed: ${pathValidation.reason}`);
        err.code = 'UPDATE_ARTIFACT_INVALID';
        err.entryPath = fileName;
        throw err;
      }

      entries.push({
        path: pathValidation.normalizedPath,
        rawPath: fileName,
        isDirectory: fileName.endsWith('/') || fileName.endsWith('\\'),
        compressionMethod,
        compressedSize,
        uncompressedSize,
        localHeaderOffset
      });

      pos += 46 + fileNameLength + extraFieldLength + fileCommentLength;
    }

    return {
      filePath,
      fileSize,
      totalEntries: entries.length,
      entries
    };
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Extracts a specific single small text/json file from a ZIP archive by path.
 */
function extractZipEntryContent(filePath, targetEntryPath) {
  const info = inspectZipFile(filePath);
  const normalizedTarget = targetEntryPath.replace(/\\/g, '/');

  const entry = info.entries.find((e) => e.path === normalizedTarget || e.path === `${normalizedTarget}/`);
  if (!entry) {
    return null;
  }

  const fd = fs.openSync(filePath, 'r');
  try {
    const localBuf = Buffer.alloc(30);
    fs.readSync(fd, localBuf, 0, 30, entry.localHeaderOffset);

    if (localBuf.readUInt32LE(0) !== LOCAL_HEADER_SIGNATURE) {
      throw new Error('Invalid Local File Header signature');
    }

    const localFileNameLen = localBuf.readUInt16LE(26);
    const localExtraLen = localBuf.readUInt16LE(28);
    const dataOffset = entry.localHeaderOffset + 30 + localFileNameLen + localExtraLen;

    const dataBuf = Buffer.alloc(entry.compressedSize);
    fs.readSync(fd, dataBuf, 0, entry.compressedSize, dataOffset);

    if (entry.compressionMethod === 0) {
      // Stored (no compression)
      return dataBuf;
    } else if (entry.compressionMethod === 8) {
      // Deflated
      return zlib.inflateRawSync(dataBuf);
    } else {
      throw new Error(`Unsupported zip compression method: ${entry.compressionMethod}`);
    }
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Validates Desktop ZIP archive structural completeness.
 */
function validateDesktopArchiveStructure(filePath) {
  const info = inspectZipFile(filePath);
  const paths = info.entries.map((e) => e.path);

  const hasExe = paths.some((p) => p === 'NexoraSkillsManager.exe' || p.endsWith('/NexoraSkillsManager.exe'));
  const hasAsar = paths.some((p) => p === 'resources/app.asar' || p.endsWith('/resources/app.asar') || p === 'app.asar');

  if (!hasExe) {
    const err = new Error("Desktop archive missing required executable 'NexoraSkillsManager.exe'");
    err.code = 'UPDATE_ARTIFACT_INVALID';
    throw err;
  }

  if (!hasAsar) {
    const err = new Error("Desktop archive missing required bundle 'resources/app.asar'");
    err.code = 'UPDATE_ARTIFACT_INVALID';
    throw err;
  }

  return { valid: true, info };
}

/**
 * Validates Shared Runtime ZIP archive structural completeness and version.
 */
function validateRuntimeArchiveStructure(filePath, expectedVersion = null) {
  const info = inspectZipFile(filePath);
  const paths = info.entries.map((e) => e.path);

  const hasEngine = paths.some((p) => p.startsWith('runtime/engine/') || p.startsWith('engine/'));
  const hasBridge = paths.some((p) => p === 'runtime/bridge/NexoraDesktopBridgeHost.ps1' || p === 'bridge/NexoraDesktopBridgeHost.ps1');
  const hasSkills = paths.some((p) => p.startsWith('runtime/skills/') || p.startsWith('skills/'));
  const hasVersionFile = paths.some((p) => p === 'runtime/nexora-version.json' || p === 'nexora-version.json');

  if (!hasEngine) {
    const err = new Error("Runtime archive missing 'runtime/engine/' component");
    err.code = 'UPDATE_ARTIFACT_INVALID';
    throw err;
  }

  if (!hasBridge) {
    const err = new Error("Runtime archive missing 'runtime/bridge/NexoraDesktopBridgeHost.ps1'");
    err.code = 'UPDATE_ARTIFACT_INVALID';
    throw err;
  }

  if (!hasSkills) {
    const err = new Error("Runtime archive missing 'runtime/skills/' component");
    err.code = 'UPDATE_ARTIFACT_INVALID';
    throw err;
  }

  if (!hasVersionFile) {
    const err = new Error("Runtime archive missing 'runtime/nexora-version.json'");
    err.code = 'UPDATE_ARTIFACT_INVALID';
    throw err;
  }

  // Version extraction and validation
  if (expectedVersion) {
    let verBuffer = extractZipEntryContent(filePath, 'runtime/nexora-version.json');
    if (!verBuffer) {
      verBuffer = extractZipEntryContent(filePath, 'nexora-version.json');
    }

    if (verBuffer) {
      try {
        const verObj = JSON.parse(verBuffer.toString('utf8'));
        const verStr = verObj.version || verObj.coreVersion;
        if (verStr && verStr.trim() !== expectedVersion.trim()) {
          const err = new Error(`Runtime archive version ('${verStr}') does not match expected release version ('${expectedVersion}')`);
          err.code = 'UPDATE_ARTIFACT_INVALID';
          throw err;
        }
      } catch (e) {
        if (e.code === 'UPDATE_ARTIFACT_INVALID') throw e;
      }
    }
  }

  return { valid: true, info };
}

module.exports = {
  validateZipEntryPath,
  inspectZipFile,
  extractZipEntryContent,
  validateDesktopArchiveStructure,
  validateRuntimeArchiveStructure
};
