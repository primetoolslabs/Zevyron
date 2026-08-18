# Zevyron 3.0 Stable Readiness

The 3.0 line should not be promoted to Stable until all items below are validated on Windows.

## CI
- [ ] `pnpm install --frozen-lockfile`
- [ ] TypeScript node/web checks
- [ ] Automated tests
- [ ] Release audit
- [ ] Stability audit
- [ ] i18n audit
- [ ] Windows installer build
- [ ] Release asset validation

## Installation and updater
- [ ] Clean install
- [ ] Install over 2.29.x Stable
- [ ] Stable update channel
- [ ] Beta update channel
- [ ] Preview update channel
- [ ] Download progress
- [ ] Restart and install
- [ ] Update history
- [ ] Local-installer recovery flow

## Safety
- [ ] Safe tweak apply/undo
- [ ] Moderate tweak confirmation
- [ ] Advanced tweak hidden unless Expert Mode is active
- [ ] Advanced tweak confirmation
- [ ] Session rollback
- [ ] Restore point creation
- [ ] Safety history
- [ ] No Defender/Firewall blanket-disable paths

## Intelligent flow
- [ ] PC Health analysis
- [ ] Recommendations explain why they apply
- [ ] Advanced tweaks excluded from automatic recommendations
- [ ] Before × After uses measured values
- [ ] Missing sensors display unavailable
- [ ] Session rollback IDs are recorded

## Modules
- [ ] Game Mode
- [ ] Startup Manager disable/restore
- [ ] Smart Cleanup analyze/clean
- [ ] Network Center
- [ ] Hardware Monitor
- [ ] Notification Center
- [ ] Report Center
- [ ] Profile export/import
- [ ] Repair Zevyron
- [ ] Accessibility and scaling
- [ ] About
- [ ] Debloat inside Optimizations

## UI / multilingual
- [ ] Portuguese review
- [ ] English review
- [ ] Spanish review
- [ ] No mixed-language dialogs
- [ ] 100%, 125%, 150% Windows scaling
- [ ] 1080p layout
- [ ] 1440p layout
- [ ] Sidebar scrolling

## Final release
Only after this checklist passes should `3.0.0-beta.x` be promoted to `3.0.0`.
