# Antigravity Pro Max Skill Library

## Purpose

This library provides optional high-capability skill packs for large or complex Antigravity projects.

Simple projects should normally use default Antigravity without loading Pro Max packs.

---

## Library Structure

<Antigravity-Pro-Max-Skill installation folder>

- Frontend-Pro-Max
- Backend-Pro-Max
- Shared-Pro-Max
- Loaders
- README.md

---

# Frontend Pro Max

Use for:

- Large Flutter applications
- Complex mobile interfaces
- Large websites
- Responsive interfaces
- UI/UX implementation
- Animations
- Accessibility
- Widget architecture
- Frontend testing
- Frontend performance

Example:

agy-skills frontend

This activates:

Frontend Pro Max
+
Shared Pro Max

---

# Backend Pro Max

Use for:

- APIs
- Authentication
- Databases
- Supabase
- PostgreSQL
- Backend architecture
- RLS
- Synchronization
- Server development
- Backend security
- Backend testing

Example:

agy-skills backend

This activates:

Backend Pro Max
+
Shared Pro Max

If Frontend Pro Max is already active, the loader asks whether it should remain enabled.

Y = keep frontend and backend

N = disable frontend and switch to backend

C = cancel

---

# Shared Pro Max

Shared Pro Max contains skills useful to both frontend and backend development.

Examples include:

- code review
- debugging
- architecture review
- test execution
- security auditing
- Git workflows
- optimization
- orchestration
- documentation

Shared Pro Max is automatically enabled with Frontend or Backend Pro Max.

---

# Full Stack Pro Max

Command:

agy-skills fullstack

Activates:

Frontend Pro Max
Backend Pro Max
Shared Pro Max

Use only for complex full-stack projects.

---

# Default Mode

Command:

agy-skills default

Removes the Pro Max packs managed by this library from the current project.

Use this for simple projects that do not require specialized skills.

---

# Status

Command:

agy-skills status

Shows which Pro Max packs are currently active for the project.

---

# Project Scope

The library master copies live in:

<Antigravity-Pro-Max-Skill installation folder>

Activated skills are copied into:

<project>\.agents\skills

Therefore Pro Max skills are project-specific rather than globally available across every project.

---

# Recommended Workflow

Simple Project:

Default Antigravity

Complex Frontend:

Frontend Pro Max
+
Shared Pro Max

Complex Backend:

Backend Pro Max
+
Shared Pro Max

Complex Full Stack:

Frontend Pro Max
+
Backend Pro Max
+
Shared Pro Max

When implementation finishes:

Run tests
Run review
Run security checks where relevant
Return to default mode if Pro Max is no longer needed.

---

# Commands

agy-skills frontend

agy-skills backend

agy-skills fullstack

agy-skills shared

agy-skills default

agy-skills status

