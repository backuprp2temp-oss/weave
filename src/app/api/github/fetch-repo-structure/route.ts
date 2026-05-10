import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  parseRepoUrl,
  getOctokit,
  getRepositoryTree,
  buildFileTree,
  selectImportantFiles,
  getMultipleFileContents,
  handleGitHubError,
  checkRepositoryAccess,
} from "@/lib/github";
import { z } from "zod";

const fetchRepoStructureSchema = z.object({
  repoUrl: z.string().url("Invalid repository URL"),
  branch: z.string().optional().default("main"),
  maxDepth: z.number().optional().default(3),
  includeContents: z.boolean().optional().default(false),
  maxFiles: z.number().optional().default(50),
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
    const validationResult = fetchRepoStructureSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.message },
        { status: 400 }
      );
    }

    const { repoUrl, branch, maxDepth, includeContents, maxFiles } =
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

    // Check repository access
    const hasAccess = await checkRepositoryAccess(owner, repo, octokit);
    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "Cannot access this repository",
        },
        { status: 403 }
      );
    }

    // Get repository tree
    const tree = await getRepositoryTree(owner, repo, branch, octokit);

    // Build structured file tree
    const fileTree = buildFileTree(tree, maxDepth);

    // Select important files
    const importantFiles = selectImportantFiles(tree, maxFiles);

    // Optionally fetch file contents
    let fileContents: any[] = [];
    if (includeContents) {
      fileContents = await getMultipleFileContents(
        owner,
        repo,
        importantFiles,
        branch,
        octokit
      );
    }

    return NextResponse.json({
      success: true,
      fileTree,
      importantFiles,
      fileContents: includeContents ? fileContents : undefined,
      totalFiles: tree.tree?.filter((item: any) => item.type === "blob").length || 0,
      branch,
    });
  } catch (error: any) {
    console.error("Fetch repository structure error:", error);

    return NextResponse.json(
      { error: handleGitHubError(error) },
      { status: error.status || 500 }
    );
  }
}
