export interface DiffLine {
  type: 'add' | 'remove' | 'unchanged';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

/**
 * Simple line-by-line diff using a basic LCS (Longest Common Subsequence) approach.
 * Returns an array of DiffLine objects representing additions, removals, and unchanged lines.
 */
export function computeDiff(oldText: string, newText: string): DiffLine[] {
  if (!oldText && !newText) return [];
  if (!oldText) {
    return newText.split('\n').map((content, i) => ({
      type: 'add' as const,
      content,
      newLineNum: i + 1,
    }));
  }
  if (!newText) {
    return oldText.split('\n').map((content, i) => ({
      type: 'remove' as const,
      content,
      oldLineNum: i + 1,
    }));
  }

  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // Build LCS table
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({
        type: 'unchanged',
        content: oldLines[i - 1],
        oldLineNum: i,
        newLineNum: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({
        type: 'add',
        content: newLines[j - 1],
        newLineNum: j,
      });
      j--;
    } else {
      result.push({
        type: 'remove',
        content: oldLines[i - 1],
        oldLineNum: i,
      });
      i--;
    }
  }

  return result.reverse();
}

/**
 * Count the number of changed lines (additions + removals).
 */
export function countChanges(diff: DiffLine[]): number {
  return diff.filter((line) => line.type !== 'unchanged').length;
}
