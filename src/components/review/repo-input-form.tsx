"use client";

import { useState, useCallback } from "react";
import { useRepoValidation, type RepoValidationResult } from "@/hooks/use-github";
import { Loader2, CheckCircle2, AlertCircle, Star, GitFork, Code } from "lucide-react";
import { GitHubIcon } from "@/components/ui/github-icon";
import { cn } from "@/lib/utils";

interface RepoInputFormProps {
  onRepoValidated?: (repo: RepoValidationResult) => void;
  initialUrl?: string;
}

export function RepoInputForm({ onRepoValidated, initialUrl }: RepoInputFormProps) {
  const [repoUrl, setRepoUrl] = useState(initialUrl || "");
  const [isValidated, setIsValidated] = useState(false);
  const [validatedRepo, setValidatedRepo] = useState<RepoValidationResult | null>(null);

  const {
    mutate: validateRepo,
    isPending,
    error,
    reset,
  } = useRepoValidation();

  const handleValidate = useCallback(() => {
    if (!repoUrl.trim()) return;

    validateRepo(repoUrl.trim(), {
      onSuccess: (repo) => {
        setValidatedRepo(repo);
        setIsValidated(true);
        onRepoValidated?.(repo);
      },
      onError: () => {
        setValidatedRepo(null);
        setIsValidated(false);
      },
    });
  }, [repoUrl, validateRepo, onRepoValidated]);

  const handleReset = useCallback(() => {
    setRepoUrl("");
    setIsValidated(false);
    setValidatedRepo(null);
    reset();
  }, [reset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleValidate();
  };

  return (
    <div className="space-y-4">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="repo-url" className="block text-sm font-medium mb-2">
            GitHub Repository URL
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <GitHubIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="repo-url"
                type="text"
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                  if (isValidated) {
                    setIsValidated(false);
                    setValidatedRepo(null);
                    reset();
                  }
                }}
                placeholder="https://github.com/owner/repo"
                className={cn(
                  "w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary",
                  error && "border-red-500"
                )}
                disabled={isPending}
              />
            </div>
            <button
              type="submit"
              disabled={isPending || !repoUrl.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-fit"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Validate"
              )}
            </button>
            {isValidated && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border rounded-lg hover:bg-muted"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error.message}</span>
          </div>
        )}
      </form>

      {/* Validation Success - Repo Preview Card */}
      {isValidated && validatedRepo && (
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{validatedRepo.fullName}</h3>
                {validatedRepo.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {validatedRepo.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{validatedRepo.stars} stars</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <GitFork className="w-4 h-4 text-muted-foreground" />
                  <span>{validatedRepo.forks} forks</span>
                </div>
                {validatedRepo.language && (
                  <div className="flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-blue-500" />
                    <span>{validatedRepo.language}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs",
                      validatedRepo.isPrivate
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    )}
                  >
                    {validatedRepo.isPrivate ? "Private" : "Public"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Default branch:</span>
                <code className="px-2 py-0.5 bg-muted rounded">
                  {validatedRepo.defaultBranch}
                </code>
              </div>

              <a
                href={validatedRepo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <GitHubIcon className="w-4 h-4" />
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
