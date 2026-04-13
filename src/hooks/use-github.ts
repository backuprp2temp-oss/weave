import { useMutation } from "@tanstack/react-query";
import { formatUrl } from "@/lib/utils";

export interface RepoValidationResult {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  isPrivate: boolean;
  stars: number;
  forks: number;
  language: string | null;
  url: string;
}

export interface RepoValidationError {
  error: string;
  details?: any;
  remaining?: number;
  resetAt?: string;
}

async function validateRepo(repoUrl: string): Promise<RepoValidationResult> {
  const response = await fetch("/api/github/validate-repo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ repoUrl }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Validation failed");
  }

  return data.repo;
}

export function useRepoValidation() {
  return useMutation<RepoValidationResult, Error, string>({
    mutationFn: validateRepo,
    retry: false,
    onError: (error) => {
      console.error("Repo validation error:", error);
    },
  });
}

interface RepoStructureParams {
  repoUrl: string;
  branch?: string;
  maxDepth?: number;
  includeContents?: boolean;
  maxFiles?: number;
}

export interface FileTreeNode {
  path: string;
  name: string;
  type: "file" | "dir";
  sha: string;
  children?: FileTreeNode[];
}

export interface FileContent {
  path: string;
  content: string;
  sha: string;
  size: number;
}

export interface RepoStructureResult {
  fileTree: FileTreeNode[];
  importantFiles: string[];
  fileContents?: FileContent[];
  totalFiles: number;
  branch: string;
}

async function fetchRepoStructure(
  params: RepoStructureParams
): Promise<RepoStructureResult> {
  const response = await fetch("/api/github/fetch-repo-structure", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch repository structure");
  }

  return data;
}

export function useRepoStructure() {
  return useMutation<RepoStructureResult, Error, RepoStructureParams>({
    mutationFn: fetchRepoStructure,
    retry: false,
    onError: (error) => {
      console.error("Fetch repo structure error:", error);
    },
  });
}

// Utility hook for validating URL format
export function useUrlValidation() {
  return function validateUrl(url: string): boolean {
    if (!url) return false;

    // Check if it's a valid URL or owner/repo format
    const githubUrlPattern = /^https?:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/i;
    const ownerRepoPattern = /^[\w-]+\/[\w.-]+$/;

    return githubUrlPattern.test(url) || ownerRepoPattern.test(url);
  };
}
