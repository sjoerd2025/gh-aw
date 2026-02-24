# Architecture: "Deploy to Your Repo" Feature

## Overview

Add a "Deploy to GitHub" button that lets users push their configured workflow directly to a GitHub repo as a PR — entirely from the browser, no backend needed.

## Approach: PAT (Personal Access Token) — Purely Frontend

### Why PAT?

| Option | Purely Frontend? | UX | Complexity |
|--------|-----------------|-----|------------|
| **A: PAT (recommended)** | Yes | Good (one-time setup) | Low |
| B: Device Flow OAuth | No (needs CORS proxy) | Decent | Medium |
| C: OAuth + Cloudflare Worker | No (needs Worker) | Best | Medium-High |
| D: Copy `gh` CLI command | Yes | Poor (manual) | Very Low |

- GitHub REST API (`api.github.com`) **supports CORS** — browser `fetch()` works
- GitHub OAuth token endpoints **do NOT support CORS** — OAuth needs a proxy server
- PAT is the only fully-frontend auth option
- Fine-grained PATs can be scoped to specific repos

## UI Flow

### Step 1: Token Setup (one-time)

```
┌─────────────────────────────────────────┐
│  Deploy to GitHub                   [X] │
│                                         │
│  To deploy workflows, you need a        │
│  GitHub Personal Access Token with      │
│  repo and workflow scopes.              │
│                                         │
│  [Create a token on GitHub →]           │
│                                         │
│  Token: [_________________________]     │
│  [ ] Remember this token                │
│                                         │
│  [Cancel]            [Save & Continue]  │
└─────────────────────────────────────────┘
```

Link: `github.com/settings/tokens/new?scopes=repo,workflow&description=gh-aw-editor-deploy`

### Step 2: Repository Selection

```
┌─────────────────────────────────────────┐
│  Deploy to GitHub                   [X] │
│                                         │
│  Repository:                            │
│  [owner/repo___________________]        │
│                                         │
│  Branch name:                           │
│  [aw/my-workflow_______________]        │
│                                         │
│  Base branch:                           │
│  [main_________________________]        │
│                                         │
│  [Cancel]                    [Deploy]   │
└─────────────────────────────────────────┘
```

### Step 3: Progress

```
┌─────────────────────────────────────────┐
│  Deploying...                       [X] │
│                                         │
│  ✓ Verified repository access           │
│  ✓ Created branch aw/my-workflow        │
│  ✓ Uploaded workflow.md                 │
│  ● Uploading workflow.lock.yml...       │
│  ○ Creating pull request                │
└─────────────────────────────────────────┘
```

### Step 4: Success

```
┌─────────────────────────────────────────┐
│  Deployed! ✓                        [X] │
│                                         │
│  Pull request created successfully.     │
│                                         │
│  [View PR on GitHub →]                  │
│                                         │
│  [Done]                                 │
└─────────────────────────────────────────┘
```

## GitHub API Calls

All calls to `api.github.com` with `Authorization: Bearer {token}`:

| Step | API Call | Purpose |
|------|----------|---------|
| 1 | `GET /user` | Validate token, get username |
| 2 | `GET /repos/{owner}/{repo}` | Verify repo exists + push access |
| 3 | `GET /repos/{owner}/{repo}/git/ref/heads/{branch}` | Get default branch SHA |
| 4 | `POST /repos/{owner}/{repo}/git/refs` | Create branch `aw/{name}` |
| 5 | `PUT /repos/{owner}/{repo}/contents/.github/workflows/{name}.md` | Upload workflow source |
| 6 | `PUT /repos/{owner}/{repo}/contents/.github/workflows/{name}.lock.yml` | Upload compiled YAML |
| 7 | `POST /repos/{owner}/{repo}/pulls` | Create the PR |

**Required token scopes**: `repo` + `workflow`

**Important**: Do NOT include `X-GitHub-Api-Version` header — it causes CORS preflight failures.

## Files to Create

| File | Purpose |
|------|---------|
| `src/stores/deployStore.ts` | Zustand store: token, step, repo, progress, prUrl |
| `src/utils/githubApi.ts` | Thin `fetch()` wrapper for GitHub REST API |
| `src/utils/deploy.ts` | Orchestration: branch → files → PR |
| `src/components/Deploy/DeployDialog.tsx` | Multi-step dialog (Radix Dialog) |
| `src/components/Deploy/TokenSetup.tsx` | Step 1: token input |
| `src/components/Deploy/RepoSelector.tsx` | Step 2: repo/branch selection |
| `src/components/Deploy/DeployProgress.tsx` | Step 3: progress checklist |
| `src/components/Deploy/DeploySuccess.tsx` | Step 4: success + PR link |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/Header/Header.tsx` | Add "Deploy to GitHub" button to Export menu |

## Files Deployed to the Repo

The PR creates two files:

1. **`.github/workflows/{name}.md`** — workflow source (human-editable)
2. **`.github/workflows/{name}.lock.yml`** — compiled YAML (machine-generated)

Both from `workflowStore.compiledMarkdown` and `workflowStore.compiledYaml`.

## PR Body Template

```markdown
## Add Agentic Workflow: {name}

{description}

### Files
- `.github/workflows/{name}.md` — Workflow source (edit this)
- `.github/workflows/{name}.lock.yml` — Compiled output (auto-generated)

### Trigger
{trigger event description}

### Next Steps
1. Review the workflow configuration
2. Merge this PR to activate the workflow

---
*Deployed from [gh-aw Visual Editor](https://mossaka.github.io/gh-aw-editor-visualizer/)*
```

## Security

- Token stored in `localStorage` (same as existing Zustand stores)
- Static site with no user-generated HTML — minimal XSS surface
- Fine-grained PATs can scope to specific repos
- Token never included in committed files
- User can revoke token anytime from GitHub settings

## Deploy Store Schema

```typescript
interface DeployState {
  token: string | null;
  username: string | null;
  isOpen: boolean;
  step: 'auth' | 'repo' | 'deploying' | 'success' | 'error';
  repoSlug: string;      // "owner/repo"
  branchName: string;     // "aw/workflow-name"
  baseBranch: string;     // "main"
  progress: { id: string; label: string; status: 'pending' | 'running' | 'done' | 'error' }[];
  prUrl: string | null;
  error: string | null;
}
```

## Fallback: Copy gh CLI Command

For users who don't want browser tokens, add "Copy CLI command" to Export menu:

```bash
# Save workflow files
cat > .github/workflows/{name}.md << 'WORKFLOW_EOF'
{markdown content}
WORKFLOW_EOF

# Compile
gh aw compile .github/workflows/{name}.md

# Create PR
gh pr create --title "Add agentic workflow: {name}" --body "..."
```

## Future Enhancements (V2)

- Repo search autocomplete via `GET /user/repos`
- Token encryption with user passphrase
- Branch conflict resolution
- Update existing workflow (not just create)
- Device Flow OAuth (when GitHub adds CORS support)
- Import workflow from repo into editor
