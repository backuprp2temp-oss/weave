"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GitHubIcon } from "@/components/ui/github-icon";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl shadow-lg border">
        <div className="text-center">
          <h1 className="text-3xl font-bold">AI Code Reviewer</h1>
          <p className="mt-2 text-muted-foreground">
            Get AI-powered insights on your GitHub repositories
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <GitHubIcon className="w-5 h-5" />
            Sign in with GitHub
          </button>

          <p className="text-xs text-center text-muted-foreground">
            We'll request access to your public profile and repositories
          </p>
        </div>

        <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
          <h3 className="font-medium">What you can do:</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>Get constructive feedback on your code</li>
            <li>Identify potential issues and improvements</li>
            <li>Request AI-assisted code changes</li>
            <li>Submit PRs or commits directly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
