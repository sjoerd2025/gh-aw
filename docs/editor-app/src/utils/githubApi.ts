const API_BASE = 'https://api.github.com';

export class GitHubApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

async function githubFetch(
  token: string,
  endpoint: string,
  options?: RequestInit,
): Promise<any> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new GitHubApiError(res.status, body.message || res.statusText);
  }
  return res.json();
}

export async function validateToken(
  token: string,
): Promise<{ login: string; avatar_url: string }> {
  return githubFetch(token, '/user');
}

export async function getRepo(
  token: string,
  owner: string,
  repo: string,
): Promise<{ default_branch: string; permissions: { push: boolean } }> {
  return githubFetch(token, `/repos/${owner}/${repo}`);
}

export async function getDefaultBranchSha(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<string> {
  const ref = await githubFetch(
    token,
    `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
  );
  return ref.object.sha;
}

export async function createBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  sha: string,
): Promise<void> {
  await githubFetch(token, `/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha,
    }),
  });
}

export async function createOrUpdateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
): Promise<void> {
  await githubFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: btoa(unescape(encodeURIComponent(content))),
        branch,
      }),
    },
  );
}

export async function createPullRequest(
  token: string,
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body: string,
): Promise<{ html_url: string; number: number }> {
  return githubFetch(token, `/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ title, head, base, body }),
  });
}
