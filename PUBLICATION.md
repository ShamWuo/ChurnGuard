# Publishing ChurnGuard v1.0.0

This guide walks you through turning the local project into a public GitHub repository with a tagged v1.0.0 release.

## 1. Create the GitHub repository
Create a new public repository named `ChurnGuard` under your GitHub account (e.g. `ShamWuo/ChurnGuard`). Do NOT initialize with a README or license (we already have them locally).

## 2. Point local repo at new remote
```powershell
git remote remove origin # only if an old origin exists
git remote add origin https://github.com/ShamWuo/ChurnGuard.git
```

## 3. Ensure clean working tree
```powershell
git status
```
Commit any outstanding changes (README, LICENSE, demo scripts).

## 4. Set version (if adjusting)
The CHANGELOG and release notes already reference 1.0.0. If you need to bump, edit `package.json` and `CHANGELOG.md` before tagging.

## 5. Commit and push main
```powershell
git push -u origin main
```

## 6. Create and push the tag
```powershell
git tag -a v1.0.0 -m "ChurnGuard v1.0.0"
git push origin v1.0.0
```

If re-tagging after a fix, delete local + remote tag then recreate:
```powershell
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0
git tag -a v1.0.0 -m "ChurnGuard v1.0.0"
git push origin v1.0.0
```

## 7. Draft the GitHub Release
In the GitHub UI: Releases → Draft new release
- Tag: v1.0.0 (choose existing)
- Title: ChurnGuard v1.0.0
- Description: Paste contents of `docs/RELEASE_NOTES_v1.0.0.md`
- Set as first release / latest
Publish.

## 8. Validate badges & links
- CI badge loads: README top
- License badge links to LICENSE
- Internal docs (POSTGRES_MIGRATION, APP_DESCRIPTION) open.

## 9. Optional: Docker image publish
Add a GitHub Action (or manual) to build and push `ghcr.io/shamwuo/churnguard:1.0.0` and `:latest`.

## 10. Post-release checklist
- Open an issue for 1.1.0 roadmap items (see release notes roadmap section)
- Announce on chosen channels (X, IndieHackers)
- Monitor `/api/ready` uptime and Stripe webhook logs.

Done — ChurnGuard is public.