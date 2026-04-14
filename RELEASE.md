# Release Checklist

Use this checklist when preparing a new release of MarkUp.

## Pre-Release

- [ ] All tests pass (`tests/run-all.html` — 1234+ tests, 0 failures)
- [ ] Manual QA checklist reviewed (`tests/test-checklist.md`)
- [ ] No uncommitted changes (`git status` is clean)

## Version Bump

Update the version string in **all 5 locations**:

- [ ] `src/manifest.json` → `"version": "X.Y.Z"`
- [ ] `README.md` → badge: `https://img.shields.io/badge/version-X.Y.Z-blue`
- [ ] `src/popup/popup.html` → version display text
- [ ] `src/options/options.html` → version display text
- [ ] `scripts/package.sh` → `VERSION="X.Y.Z"`

> **Tip:** Search for the old version string across the project:
> ```bash
> grep -rn "0.3.0" --include="*.json" --include="*.html" --include="*.md" --include="*.sh" .
> ```

## Changelog

- [ ] Add a new version section to `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) format
- [ ] List all user-facing changes under `Added`, `Changed`, `Fixed`, or `Removed`

## Documentation

- [ ] `README.md` — features list matches current functionality
- [ ] `AGENTS.md` — new phase entry appended (if applicable)
- [ ] `PLAN.md` — steps marked as complete (if applicable)

## Build & Package

```bash
# Build the distributable zip
bash scripts/package.sh

# Verify the output
ls -la markup-extension-v*.zip
```

- [ ] Zip created successfully
- [ ] Zip loads as unpacked extension without errors

## Git Tag & Push

```bash
# Commit all version bump changes
git add .
git commit -m "chore: bump version to X.Y.Z"

# Create annotated tag
git tag -a vX.Y.Z -m "vX.Y.Z — brief release description"

# Push commit and tag
git push origin main --tags
```

- [ ] Commit pushed to `main`
- [ ] Tag pushed to `origin`

## GitHub Release

1. Go to **GitHub → Releases → [Draft a new release](https://github.com/fakhrulsojib/markUp/releases/new)**
2. Select the `vX.Y.Z` tag
3. Title: `MarkUp vX.Y.Z — brief description`
4. Description: Copy from `CHANGELOG.md` (the new version section)
5. Attach: `markup-extension-vX.Y.Z.zip`
6. Mark as **Latest release**
7. Publish

- [ ] Release published
- [ ] Zip attached to release
- [ ] Release notes match CHANGELOG

## Post-Release

- [ ] Verify the [latest release link](https://github.com/fakhrulsojib/markUp/releases/latest) works
- [ ] Download the zip from the release and test a fresh install
