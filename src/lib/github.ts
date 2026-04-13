import { Octokit } from "@octokit/rest";

// Type aliases
export interface GitHubRepo {
  owner: { login: string };
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  private: boolean;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  html_url: string;
  size: number;
}

export interface GitHubTreeItem {
  path?: string;
  mode?: string;
  type?: string;
  sha?: string;
  size?: number;
}

export interface GitHubTree {
  sha?: string;
  url?: string;
  tree: GitHubTreeItem[];
  truncated?: boolean;
}

export interface GitHubFileContent {
  type: string;
  encoding: string;
  size: number;
  name: string;
  path: string;
  content: string;
  sha: string;
  url: string;
  git_url: string;
  html_url: string;
  download_url: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface FileInfo {
  path: string;
  name: string;
  type: "file" | "dir";
  size?: number;
  sha: string;
}

export interface FileTree {
  path: string;
  name: string;
  type: "file" | "dir";
  sha: string;
  children?: FileTree[];
}

export interface FileContent {
  path: string;
  content: string;
  sha: string;
  size: number;
}

/**
 * Get Octokit instance with user's token or fallback to PAT
 */
export function getOctokit(accessToken?: string): Octokit {
  const token = accessToken || process.env.GITHUB_PAT;
  
  if (!token) {
    throw new Error("GitHub token not provided");
  }

  return new Octokit({
    auth: token,
    baseUrl: "https://api.github.com",
  });
}

/**
 * Validate and extract repository information from URL
 */
export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  try {
    // Handle both full URLs and owner/repo format
    if (!repoUrl.includes("/")) {
      const [owner, repo] = repoUrl.split("/");
      if (owner && repo) {
        return { owner, repo: repo.replace(/\.git$/, "") };
      }
      return null;
    }

    const url = new URL(repoUrl);
    if (url.hostname !== "github.com") return null;

    const [, owner, repo] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;

    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

/**
 * Get repository information
 */
export async function getRepositoryInfo(
  owner: string,
  repo: string,
  octokit: Octokit
): Promise<GitHubRepo> {
  const { data } = await octokit.repos.get({
    owner,
    repo,
  });
  return data as GitHubRepo;
}

/**
 * Check if user has access to repository
 */
export async function checkRepositoryAccess(
  owner: string,
  repo: string,
  octokit: Octokit
): Promise<boolean> {
  try {
    await getRepositoryInfo(owner, repo, octokit);
    return true;
  } catch (error: any) {
    if (error.status === 404 || error.status === 401 || error.status === 403) {
      return false;
    }
    throw error;
  }
}

/**
 * Get repository tree (file structure)
 */
export async function getRepositoryTree(
  owner: string,
  repo: string,
  branch: string,
  octokit: Octokit
): Promise<GitHubTree> {
  // First get the branch to get the commit SHA
  const { data: branchData } = await octokit.repos.getBranch({
    owner,
    repo,
    branch,
  });

  const commitSha = (branchData as GitHubBranch).commit.sha;

  // Get the tree (recursive, max 100000 entries)
  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: commitSha,
    recursive: "true",
  });

  return tree as GitHubTree;
}

/**
 * Get file content from repository
 */
export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  octokit: Octokit
): Promise<FileContent> {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref,
  });

  // Handle file response
  if (Array.isArray(data) || (data as any).type !== "file") {
    throw new Error(`Path "${path}" is not a file`);
  }

  const fileData = data as GitHubFileContent;
  const content = fileData.content
    ? Buffer.from(fileData.content, "base64").toString("utf-8")
    : "";

  return {
    path: fileData.path,
    content,
    sha: fileData.sha,
    size: fileData.size,
  };
}

/**
 * Build structured file tree from flat tree data
 */
export function buildFileTree(tree: GitHubTree, maxDepth: number = 3): FileTree[] {
  if (!tree.tree) return [];

  const rootNodes: FileTree[] = [];
  const nodeMap = new Map<string, FileTree>();

  // Filter out unwanted paths and create nodes
  const filteredTree = tree.tree.filter((item) => {
    // Skip node_modules, .git, and other unwanted paths
    const skipPaths = [
      "node_modules/",
      ".git/",
      "dist/",
      "build/",
      "coverage/",
      ".next/",
      "vendor/",
      "__pycache__/",
      ".venv/",
      "target/",
    ];

    return !skipPaths.some((skipPath) => item.path?.startsWith(skipPath));
  });

  // Create all nodes
  for (const item of filteredTree) {
    if (!item.path) continue;

    const path = item.path;
    const parts = path.split("/");
    const name = parts[parts.length - 1] || "";

    // Skip if deeper than maxDepth
    if (parts.length > maxDepth) continue;

    const node: FileTree = {
      path,
      name,
      type: item.type as "file" | "dir",
      sha: item.sha || "",
      children: item.type === "tree" ? [] : undefined,
    };

    nodeMap.set(path, node);

    // Add to root if at depth 1
    if (parts.length === 1) {
      rootNodes.push(node);
    }
  }

  // Build hierarchy
  for (const [path, node] of nodeMap) {
    const parentPath = path.split("/").slice(0, -1).join("/");
    if (parentPath && nodeMap.has(parentPath)) {
      const parentNode = nodeMap.get(parentPath)!;
      if (parentNode.children) {
        parentNode.children.push(node);
      }
    }
  }

  return rootNodes;
}

/**
 * Smart file selection - prioritizes important files
 */
export function selectImportantFiles(
  tree: GitHubTree,
  maxFiles: number = 50
): string[] {
  if (!tree.tree) return [];

  // Priority file patterns
  const highPriority = [
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "Cargo.toml",
    "go.mod",
    "pom.xml",
    "build.gradle",
    "README.md",
    "README.txt",
  ];

  const mediumPriority = [
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.json",
    ".prettierrc",
    "tsconfig.json",
    "next.config.js",
    "next.config.ts",
    "vite.config.js",
    "vite.config.ts",
    "webpack.config.js",
    "jest.config.js",
    "vitest.config.ts",
    ".env.example",
    "docker-compose.yml",
    "Dockerfile",
  ];

  const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".java"];
  const skipPaths = [
    "node_modules/",
    ".git/",
    "dist/",
    "build/",
    "coverage/",
    ".next/",
    "vendor/",
    "__pycache__/",
    ".venv/",
    "target/",
    "lock",
    ".lock",
    ".min.",
  ];

  const highPriorityFiles: string[] = [];
  const mediumPriorityFiles: string[] = [];
  const sourceFiles: string[] = [];

  for (const item of tree.tree) {
    if (!item.path || item.type !== "blob") continue;

    const path = item.path;

    // Skip unwanted paths
    if (skipPaths.some((skip) => path.includes(skip))) continue;

    // Check high priority
    if (highPriority.some((pattern) => path === pattern || path.endsWith("/" + pattern))) {
      highPriorityFiles.push(path);
      continue;
    }

    // Check medium priority
    if (mediumPriority.some((pattern) => path === pattern || path.endsWith("/" + pattern))) {
      mediumPriorityFiles.push(path);
      continue;
    }

    // Check source files
    if (sourceExtensions.some((ext) => path.endsWith(ext))) {
      sourceFiles.push(path);
    }
  }

  // Combine in priority order
  const selected = [
    ...highPriorityFiles,
    ...mediumPriorityFiles,
    ...sourceFiles.slice(0, Math.max(0, maxFiles - highPriorityFiles.length - mediumPriorityFiles.length)),
  ];

  return selected.slice(0, maxFiles);
}

/**
 * Get multiple file contents
 */
export async function getMultipleFileContents(
  owner: string,
  repo: string,
  paths: string[],
  ref: string,
  octokit: Octokit
): Promise<FileContent[]> {
  const results: FileContent[] = [];

  // Fetch in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const batchPromises = batch.map(async (path) => {
      try {
        return await getFileContent(owner, repo, path, ref, octokit);
      } catch (error: any) {
        console.error(`Error fetching ${path}:`, error.message);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(Boolean) as FileContent[]);

    // Add delay between batches to respect rate limits
    if (i + batchSize < paths.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Check GitHub API rate limit status
 */
export async function checkRateLimit(octokit: Octokit): Promise<{
  remaining: number;
  limit: number;
  reset: Date;
}> {
  const { data } = await octokit.rateLimit.get();
  return {
    remaining: (data as any).resources.core.remaining,
    limit: (data as any).resources.core.limit,
    reset: new Date((data as any).resources.core.reset * 1000),
  };
}

/**
 * Handle GitHub API errors with user-friendly messages
 */
export function handleGitHubError(error: any): string {
  if (!error) return "An unknown error occurred";

  // Octokit error
  if (error.status) {
    switch (error.status) {
      case 401:
        return "Authentication failed. Please sign in again.";
      case 403:
        if (error.message?.includes("rate limit")) {
          return "GitHub API rate limit exceeded. Please try again later.";
        }
        return "Access denied. You may not have permission to access this repository.";
      case 404:
        return "Repository not found. Please check the URL.";
      case 422:
        return "Invalid request. The repository or branch may not exist.";
      default:
        return error.message || `GitHub API error (${error.status})`;
    }
  }

  return error.message || "Failed to connect to GitHub";
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Wait before retrying
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
