# Nexora Skills Manager — Data Contracts & JSON Schemas (Phase 6.1C Corrected)

This document defines the formal data models exchanged between the Nexora Desktop UI and the backend application layer.

---

## 1. Application & System Contracts

### `ApplicationStatus`
```json
{
  "schemaVersion": "1.0.0",
  "engineStatus": "ready",
  "engineHealthy": true,
  "runtimePath": "C:\\Users\\User\\AppData\\Local\\NexoraSkillsManager\\runtime",
  "projectCount": 3,
  "activeSkillsCount": 6,
  "updateStatus": "up_to_date",
  "initializedAt": "2026-08-22T04:00:00.000Z"
}
```

### `UpdateStatus`
```json
{
  "schemaVersion": "1.0.0",
  "currentVersion": "1.0.0",
  "latestVersion": "1.0.0",
  "updateAvailable": false,
  "channel": "stable",
  "checkedAt": "2026-08-22T04:10:00.000Z",
  "modules": [
    { "name": "Core Engine", "installedVersion": "1.0.0", "availableVersion": "1.0.0", "status": "Up to date" },
    { "name": "Skill Library", "installedVersion": "1.0.0", "availableVersion": "1.0.0", "status": "Up to date" },
    { "name": "Platform Adapters", "installedVersion": "1.0.0", "availableVersion": "1.0.0", "status": "Up to date" }
  ]
}
```

---

## 2. Project Contracts

### `ProjectSummary`
```json
{
  "schemaVersion": "1.0.0",
  "id": "proj_academic_hub",
  "name": "Academic Day Hub",
  "path": "D:\\Projects\\academic_day_hub",
  "primaryType": "mobile_application",
  "developmentMode": "full_stack",
  "pathExists": true,
  "activeSkillCount": 6,
  "status": "Ready"
}
```

### `ProjectProfile`
```json
{
  "schemaVersion": "1.0.0",
  "project": {
    "id": "proj_academic_hub",
    "name": "Academic Day Hub",
    "path": "D:\\Projects\\academic_day_hub",
    "primaryType": "mobile_application",
    "developmentMode": "full_stack"
  },
  "metadata": {
    "projectId": "proj_academic_hub",
    "projectName": "Academic Day Hub",
    "projectRoot": "D:\\Projects\\academic_day_hub",
    "createdAt": "2026-08-20T10:14:00.000Z",
    "lastScan": "2026-08-22T03:45:00.000Z",
    "targetPlatforms": ["antigravity", "cursor"],
    "workingContext": {
      "workingMode": "Frontend Development",
      "target": "Mobile Application"
    }
  },
  "analysis": {
    "projectType": "mobile_application",
    "confidenceScores": { "flutter": 96 },
    "languages": ["Dart"],
    "frontend": ["Flutter"],
    "backend": ["Supabase"],
    "database": ["PostgreSQL"],
    "qa": ["Flutter Test", "Dart Analyzer"],
    "tooling": ["Flutter CLI", "Gradle"],
    "markersFound": ["pubspec.yaml", "android/", "ios/", "analysis_options.yaml"]
  },
  "skills": {
    "activeSkills": [
      "flutter-build-responsive-layout",
      "flutter-add-widget-test",
      "dart-add-unit-test",
      "frontend_design",
      "architecture-patterns",
      "test_runner"
    ],
    "recommendedSkills": [
      "flutter-build-responsive-layout",
      "flutter-add-widget-test",
      "dart-add-unit-test"
    ]
  }
}
```

### `WorkingContext` (`PROJECT_PERSISTED`)
```json
{
  "schemaVersion": "1.0.0",
  "projectId": "proj_academic_hub",
  "detectedClassification": "Full Stack Application",
  "currentWorkingMode": "Frontend Development",
  "currentTarget": "Mobile Application"
}
```

---

## 3. Skill & Recommendation Contracts

### `Recommendation`
```json
{
  "schemaVersion": "1.0.0",
  "skillId": "flutter-build-responsive-layout",
  "name": "Flutter Responsive Layout",
  "category": "Frontend",
  "matchScore": 96,
  "matchReason": "Matches Flutter UI framework detection and multi-screen requirements.",
  "compatibility": "Compatible",
  "conflicts": [],
  "alreadyActive": true,
  "preselected": true,
  "version": "v1.0.0"
}
```

### `SkillSummary`
```json
{
  "schemaVersion": "1.0.0",
  "id": "flutter-build-responsive-layout",
  "name": "Flutter Responsive Layout",
  "category": "Frontend",
  "version": "v1.0.0",
  "status": "Available",
  "path": "Frontend-Pro-Max/flutter-build-responsive-layout",
  "pack": "Frontend-Pro-Max"
}
```

### `SkillDetail`
```json
{
  "schemaVersion": "1.0.0",
  "id": "architecture-patterns",
  "name": "Architecture Patterns",
  "category": "Architecture",
  "version": "v1.0.0",
  "installedVersion": "v1.0.0",
  "availableVersion": "v1.1.0",
  "description": "Clean Architecture, repository patterns, and domain-driven design separation.",
  "overview": "Guidelines for structuring enterprise Dart and Flutter codebases with Clean Architecture.",
  "supportedPlatforms": ["Google Antigravity", "Cursor", "GitHub Copilot"],
  "tags": ["architecture", "clean-code", "ddd", "repository-pattern"],
  "rulesCount": 4,
  "scriptsCount": 2
}
```

---

## 4. Activation & Lifecycle Contracts

### `SkillActivationRequest`
```json
{
  "schemaVersion": "1.0.0",
  "projectId": "proj_academic_hub",
  "skillIds": ["flutter-build-responsive-layout", "flutter-add-widget-test"],
  "platforms": ["antigravity", "cursor"]
}
```

### `SkillActivationResult`
```json
{
  "schemaVersion": "1.0.0",
  "success": true,
  "status": "success",
  "projectId": "proj_academic_hub",
  "activatedCount": 2,
  "deployedSkills": ["flutter-build-responsive-layout", "flutter-add-widget-test"],
  "deployments": [
    { "platform": "antigravity", "status": "Success", "errors": [] },
    { "platform": "cursor", "status": "Success", "errors": [] }
  ],
  "errors": []
}
```

### `GlobalRemovalPreview`
```json
{
  "schemaVersion": "1.0.0",
  "operation": "remove_skill_all_projects",
  "skillId": "flutter-build-responsive-layout",
  "affectedCount": 3,
  "affectedProjects": [
    { "id": "proj_academic_hub", "name": "Academic Day Hub", "path": "D:\\Projects\\academic_day_hub" },
    { "id": "proj_memorlume", "name": "Memorlume", "path": "D:\\Projects\\memorlume" },
    { "id": "proj_smart_cart", "name": "Smart Cart", "path": "D:\\Projects\\smart_cart" }
  ],
  "destructive": true,
  "requiresConfirmation": true,
  "expiresAt": "2026-08-22T04:20:00.000Z"
}
```

### `GlobalRemovalResult`
```json
{
  "schemaVersion": "1.0.0",
  "success": true,
  "skillId": "flutter-build-responsive-layout",
  "affectedCount": 3,
  "successCount": 3,
  "failureCount": 0,
  "results": [
    { "projectId": "proj_academic_hub", "success": true, "error": null },
    { "projectId": "proj_memorlume", "success": true, "error": null },
    { "projectId": "proj_smart_cart", "success": true, "error": null }
  ]
}
```

---

## 5. System Health & Doctor Contracts

### `DoctorResult` (6 Mapped UI Categories)
```json
{
  "schemaVersion": "1.0.0",
  "healthy": true,
  "runtimePath": "C:\\Users\\User\\AppData\\Local\\NexoraSkillsManager\\runtime",
  "checks": [
    { "name": "Core Engine", "status": "OK", "detail": "v1.0.0 NexoraEngine.ps1 verified" },
    { "name": "Skill Library", "status": "OK", "detail": "48/48 skills loaded" },
    { "name": "CLI", "status": "OK", "detail": "nexora.cmd active in PATH" },
    { "name": "Project Registry", "status": "OK", "detail": "projects.json valid" },
    { "name": "Installation Metadata", "status": "OK", "detail": "Verified install.json" },
    { "name": "Platform Adapters", "status": "OK", "detail": "Antigravity, Cursor, Copilot active" }
  ],
  "repairsApplied": []
}
```

---

## 6. Global Aggregated Activity Entry Contract

### `ActivityEntry`
```json
{
  "schemaVersion": "1.0.0",
  "eventId": "act_8f7e6d5c4b",
  "projectId": "proj_academic_hub",
  "projectName": "Academic Day Hub",
  "timestamp": "2026-08-22T04:18:00.000Z",
  "eventType": "SKILLS",
  "userSafeMessage": "flutter-build-responsive-layout activated",
  "source": "ui",
  "metadata": {
    "skillId": "flutter-build-responsive-layout",
    "platforms": ["antigravity", "cursor"]
  }
}
```

---

## 7. Error Envelope Contract

### `BridgeError`
```json
{
  "schemaVersion": "1.0.0",
  "code": "SKILL_ACTIVATION_FAILED",
  "message": "Failed to deploy skills to Cursor platform adapter.",
  "detail": "File lock on .cursor/rules/flutter.md",
  "retryable": true,
  "operation": "activate_skills",
  "context": {
    "projectId": "proj_academic_hub",
    "failedPlatforms": ["cursor"]
  }
}
```
