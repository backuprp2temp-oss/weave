import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { parseRepoUrl, getOctokit, getRepositoryTree, selectImportantFiles, getMultipleFileContents, handleGitHubError } from "@/lib/github";
import { getLLMProvider } from "@/lib/llm";
import { buildModificationContext, estimateContextTokens, truncateToTokenLimit } from "@/lib/prompts";
import { parseChanges, validateChanges } from "@/lib/change-parser";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const promptRequestSchema = z.object({
  repoUrl: z.string().url("Invalid repository URL"),
  branch: z.string().optional().default("main"),
  userPrompt: z.string().min(10, "Prompt must be at least 10 characters"),
  provider: z.enum(["openai", "anthropic"]).optional(),
  maxFiles: z.number().optional().default(50),
  maxTokens: z.number().optional().default(128000),
  dryRun: z.boolean().optional().default(true),
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
    const validationResult = promptRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.message },
        { status: 400 }
      );
    }

    const { repoUrl, branch, userPrompt, provider, maxFiles, maxTokens, dryRun } =
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
    let contextMessages = buildModificationContext(fileContents, fileTree, userPrompt);

    // Estimate and truncate if needed
    const estimatedTokens = estimateContextTokens(
      fileContents,
      contextMessages[0].content
    );

    if (estimatedTokens > maxTokens * 0.8) {
      const truncatedFiles = truncateToTokenLimit(
        fileContents,
        maxTokens,
        contextMessages[0].content
      );
      contextMessages = buildModificationContext(truncatedFiles, fileTree, userPrompt);
    }

    // Call LLM
    const response = await llmProvider.chatCompletion(contextMessages, {
      temperature: 0.3,
      maxTokens: 4096,
    });

    // Parse changes from response
    const parsedChanges = parseChanges(response.content);
    const validation = validateChanges(parsedChanges);

    // Save to database
    const prompt = await prisma.prompt.create({
      data: {
        userId: (session.user as any).id,
        userInput: userPrompt,
        llmResponse: response.content,
        changesMade: validation.valid ? parsedChanges.files as any : null,
      },
    });

    return NextResponse.json({
      success: true,
      prompt: {
        id: prompt.id,
        response: response.content,
        changes: parsedChanges,
        validation,
        tokenUsage: response.usage,
        dryRun,
        model: response.model,
        filesAnalyzed: fileContents.length,
        createdAt: prompt.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Prompt API error:", error);

    return NextResponse.json(
      { error: handleGitHubError(error) },
      { status: error.status || 500 }
    );
  }
}
