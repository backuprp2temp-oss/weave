import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { parseRepoUrl, getOctokit, getRepositoryTree, selectImportantFiles, getMultipleFileContents, handleGitHubError } from "@/lib/github";
import { getLLMProvider, LLMProviderName } from "@/lib/llm";
import { buildReviewContext, estimateContextTokens, truncateToTokenLimit } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reviewRequestSchema = z.object({
  repoUrl: z.string().url("Invalid repository URL"),
  branch: z.string().optional().default("main"),
  customPrompt: z.string().optional().default(""),
  provider: z.enum(["openai", "anthropic"]).optional(),
  maxFiles: z.number().optional().default(50),
  maxTokens: z.number().optional().default(128000),
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
    const validationResult = reviewRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.message },
        { status: 400 }
      );
    }

    const { repoUrl, branch, customPrompt, provider, maxFiles, maxTokens } =
      validationResult.data;

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

    // Fetch repository structure
    const tree = await getRepositoryTree(owner, repo, branch, octokit);
    const importantFiles = selectImportantFiles(tree, maxFiles);

    // Fetch file contents
    const fileContents = await getMultipleFileContents(
      owner,
      repo,
      importantFiles,
      branch,
      octokit
    );

    // Get LLM provider
    const llmProvider = await getLLMProvider(provider);

    // Build context
    const fileTree: import("@/lib/github").FileTree[] = [];
    let contextMessages = buildReviewContext(fileContents, fileTree, customPrompt || undefined);

    // Estimate and truncate if needed
    const estimatedTokens = estimateContextTokens(
      fileContents,
      contextMessages[0].content // System prompt
    );

    if (estimatedTokens > maxTokens * 0.8) {
      // Truncate to 80% of max tokens to leave room for response
      const truncatedFiles = truncateToTokenLimit(
        fileContents,
        maxTokens,
        contextMessages[0].content
      );
      contextMessages = buildReviewContext(truncatedFiles, fileTree, customPrompt || undefined);
    }

    // Call LLM
    const response = await llmProvider.chatCompletion(contextMessages, {
      temperature: 0.3,
      maxTokens: 4096,
    });

    // Save to database
    const review = await prisma.review.create({
      data: {
        userId: (session.user as any).id,
        repoUrl,
        repoOwner: owner,
        repoName: repo,
        branch,
        reviewPrompt: customPrompt || null,
        llmResponse: response.content,
        modelUsed: response.model,
      },
    });

    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        content: response.content,
        model: response.model,
        tokenUsage: response.usage,
        filesAnalyzed: fileContents.length,
        createdAt: review.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Review API error:", error);

    return NextResponse.json(
      { error: handleGitHubError(error) },
      { status: error.status || 500 }
    );
  }
}
