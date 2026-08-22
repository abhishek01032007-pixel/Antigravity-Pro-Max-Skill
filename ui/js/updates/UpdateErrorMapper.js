/**
 * UpdateErrorMapper.js - Centralized Error Code to User-Friendly Message Mapping
 * Part of Nexora Skills Manager Phase 8 Update System
 */

export function getUpdateErrorMessage(code, defaultMessage = 'An unexpected update error occurred.') {
  if (!code) return defaultMessage;

  switch (code) {
    case 'UPDATE_OFFLINE':
      return "You're offline. Nexora's local features still work normally.";
    case 'UPDATE_TIMEOUT':
      return "Couldn't reach the update service in time. Please check your network connection and try again.";
    case 'UPDATE_REMOTE_ERROR':
      return 'Unable to check for updates right now. Please try again later.';
    case 'UPDATE_CLIENT_TOO_OLD':
      return 'This Nexora version cannot install the latest update automatically. Please download the latest installer manually.';
    case 'UPDATE_PLATFORM_UNSUPPORTED':
      return 'This update is not available for this system architecture.';
    case 'UPDATE_MANIFEST_INVALID':
    case 'UPDATE_MANIFEST_UNSUPPORTED':
      return 'The update manifest is invalid or unsupported by this version.';
    case 'UPDATE_DOWNLOAD_FAILED':
      return 'The update download could not be completed. Please check your connection and try again.';
    case 'UPDATE_DOWNLOAD_CANCELLED':
      return 'Download cancelled.';
    case 'UPDATE_ARTIFACT_SIZE_MISMATCH':
      return 'The downloaded update file size did not match the expected size. The download was cancelled for safety.';
    case 'UPDATE_CHECKSUM_MISMATCH':
      return 'The downloaded update failed cryptographic verification. The files were deleted for safety.';
    case 'UPDATE_ARTIFACT_INVALID':
      return 'The downloaded update archive is corrupt or invalid.';
    case 'UPDATE_INSTALL_FAILED':
      return "Update couldn't be installed.";
    case 'PARENT_EXIT_TIMEOUT':
      return 'Update cancelled because the parent application did not exit in time.';
    case 'UPDATE_OPERATION_IN_PROGRESS':
      return 'Another update operation is currently in progress.';
    default:
      return defaultMessage;
  }
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
