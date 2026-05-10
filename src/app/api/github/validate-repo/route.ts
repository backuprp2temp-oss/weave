import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  parseRepoUrl,
  getOctokit,
  getRepositoryInfo,
  checkRepositoryAccess,
  handleGitHubError,
  checkRateLimit,
} from "@/lib/github";
import { z } from "zod";

const validateRepoSchema = z.object({
  repoUrl: z.string().url("Invalid repository URL"),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validationResult = validateRepoSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.message },
        { status: 400 }
      );
    }

    const { repoUrl } = validationResult.data;

    // Parse repository URL
    const repoInfo = parseRepoUrl(repoUrl);
    if (!repoInfo) {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL" },
        { status: 400 }
      );
    }

    const { owner, repo } = repoInfo;

    // Get Octokit instance
    const octokit = getOctokit((session as any).accessToken);

    // Check rate limit first
    try {
      const rateLimit = await checkRateLimit(octokit);
      if (rateLimit.remaining < 10) {
        return NextResponse.json(
          {
            error: "GitHub API rate limit is low",
            remaining: rateLimit.remaining,
            resetAt: rateLimit.reset,
          },
          { status: 429 }
        );
      }
    } catch {
      // Continue even if rate limit check fails
      console.warn("Could not check rate limit");
    }

    // Check repository access
    const hasAccess = await checkRepositoryAccess(owner, repo, octokit);
    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "Cannot access this repository. It may be private or does not exist.",
        },
        { status: 403 }
      );
    }

    // Get repository information
    const repoInfo_data = await getRepositoryInfo(owner, repo, octokit);

    return NextResponse.json({
      success: true,
      repo: {
        owner: repoInfo_data.owner.login,
        name: repoInfo_data.name,
        fullName: repoInfo_data.full_name,
        description: repoInfo_data.description,
        defaultBranch: repoInfo_data.default_branch,
        isPrivate: repoInfo_data.private,
        stars: repoInfo_data.stargazers_count,
        forks: repoInfo_data.forks_count,
        language: repoInfo_data.language,
        url: repoInfo_data.html_url,
      },
    });
  } catch (error: any) {
    console.error("Repository validation error:", error);

    return NextResponse.json(
      { error: handleGitHubError(error) },
      { status: error.status || 500 }
    );
  }
}
