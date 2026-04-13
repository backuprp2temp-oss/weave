"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { RepoInputForm } from "@/components/review/repo-input-form";
import { useRepoValidation, type RepoValidationResult } from "@/hooks/use-github";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function NewReviewPage() {
  const { data: session } = useSession();
  const [validatedRepo, setValidatedRepo] = useState<RepoValidationResult | null>(null);
  const [branch, setBranch] = useState<string>("");
  const [reviewPrompt, setReviewPrompt] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<any>(null);

  const handleRepoValidated = (repo: RepoValidationResult) => {
    setValidatedRepo(repo);
    setBranch(repo.defaultBranch);
    setReviewResult(null);
    setError(null);
  };

  const handleSubmitReview = async () => {
    if (!validatedRepo) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoUrl: validatedRepo.url,
          branch,
          customPrompt: reviewPrompt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Review failed");
      }

      setReviewResult(data.review);
    } catch (err: any) {
      setError(err.message || "An error occurred during review");
      console.error("Review error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reviewTemplates = [
    { label: "General Code Review", value: "Please review this codebase for general best practices and code quality." },
    { label: "Security Audit", value: "Please perform a security audit focusing on vulnerabilities, input validation, and authentication." },
    { label: "Performance Review", value: "Please review this codebase for performance optimizations and bottlenecks." },
    { label: "Architecture Review", value: "Please review the architecture and suggest improvements for maintainability and scalability." },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Code Review</h1>
        <p className="text-muted-foreground mt-1">
          Enter a GitHub repository URL to get AI-powered insights
        </p>
      </div>

      {/* Repository Input */}
      <div className="bg-card border rounded-xl p-6">
        <RepoInputForm onRepoValidated={handleRepoValidated} />
      </div>

      {/* Review Options (shown after validation) */}
      {validatedRepo && (
        <>
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">Review Options</h2>

            {/* Branch Selector */}
            <div>
              <label htmlFor="branch" className="block text-sm font-medium mb-2">
                Branch
              </label>
              <input
                id="branch"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="main"
              />
            </div>

            {/* Review Templates */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Quick Templates
              </label>
              <div className="grid grid-cols-2 gap-2">
                {reviewTemplates.map((template) => (
                  <button
                    key={template.label}
                    type="button"
                    onClick={() => setReviewPrompt(template.value)}
                    className="px-3 py-2 text-sm border rounded-lg hover:bg-muted text-left transition-colors"
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt */}
            <div>
              <label htmlFor="review-prompt" className="block text-sm font-medium mb-2">
                Custom Review Instructions (optional)
              </label>
              <textarea
                id="review-prompt"
                value={reviewPrompt}
                onChange={(e) => setReviewPrompt(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Provide specific instructions for the code review..."
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitReview}
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Repository...
                </>
              ) : (
                "Start Code Review"
              )}
            </button>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Review Result */}
          {reviewResult && (
            <div className="bg-card border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold">Review Complete</h2>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>Model: {reviewResult.model}</p>
                <p>Files Analyzed: {reviewResult.filesAnalyzed}</p>
                <p>Tokens Used: {reviewResult.tokenUsage.totalTokens.toLocaleString()}</p>
              </div>

              <div className="prose dark:prose-inverter max-w-none">
                <ReactMarkdown>{reviewResult.content}</ReactMarkdown>
              </div>
            </div>
          )}
        </>
      )}

      {/* Help Section */}
      <div className="bg-muted/50 border rounded-xl p-6">
        <h3 className="font-semibold mb-2">How it works</h3>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Enter a GitHub repository URL</li>
          <li>Our AI fetches and analyzes the codebase structure and key files</li>
          <li>Receive constructive feedback and recommendations</li>
          <li>Review is saved to your history for future reference</li>
        </ol>
      </div>
    </div>
  );
}
