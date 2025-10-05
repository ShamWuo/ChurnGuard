Push instructions — run locally in PowerShell

These commands push branch `docs/e2e-ci-instructions` and open a draft PR.

1) Ensure you're on the branch and commit ready.ts change:

```powershell
git checkout -B docs/e2e-ci-instructions
git add pages/api/ready.ts
git commit -m "chore(dev): relax /api/ready in non-production to reduce e2e flakiness" || Write-Output 'commit skipped'
```

2) Push branch to origin (you may be prompted for credentials):

```powershell
git push --set-upstream origin docs/e2e-ci-instructions
```

3) (Optional) Open a draft PR with GitHub CLI:

```powershell
gh pr create --title "product/ci: productize repo" --body-file PR_BODY.md --base main --head docs/e2e-ci-instructions --draft
```

4) If CI fails, paste the failing job logs here and I'll triage fixes.

Notes:
- This environment had intermittent empty terminal output for some commands; running the above locally is the most reliable way to push and authenticate.
- If you'd like me to keep trying to push from here, say so and I'll re-attempt, but local push is recommended.
