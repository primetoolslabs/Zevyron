# Zevyron 3.0.0-beta.21 — Stability & Release Audit

This beta intentionally adds no large user-facing module.

## Release hardening
- Adds `audit:stability`.
- Adds `audit:i18n`.
- Adds `verify:stable-readiness`.
- CI now runs stability and i18n audits before generating the installer.
- Validates that all major 3.0 routes/modules remain present.
- Validates update-channel safeguards and `allowDowngrade = false`.
- Scans for high-risk remote PowerShell execution and blanket Defender/Firewall disable patterns.
- Verifies Expert Mode gating and integrated tweak help.
- Adds `STABLE_READINESS_3.0.md`.

## Multilingual status
The audit verifies required navigation keys and reports hardcoded visible-text candidates.
Hardcoded candidates are informational during beta and must be reviewed before 3.0.0 Stable.

## Preservation
All functionality from beta.9 and earlier remains present.
