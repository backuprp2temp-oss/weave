import { ChatMessage } from "@/lib/llm";
import { FileContent, FileTree } from "@/lib/github";

/**
 * System prompt for code review
 */
export const CODE_REVIEW_SYSTEM_PROMPT = `You are an expert software engineer conducting a thorough code review. Your goal is to provide constructive, actionable feedback that helps developers improve their code quality.

## Review Focus Areas:
1. **Code Quality & Best Practices**
   - Adherence to language/framework conventions
   - Clean code principles (DRY, SOLID, KISS)
   - Naming conventions and readability
   
2. **Architecture & Design**
   - Component/module organization
   - Separation of concerns
   - Scalability and maintainability
   
3. **Security**
   - Input validation and sanitization
   - Authentication/authorization
   - Data protection
   - Common vulnerabilities (XSS, SQL injection, etc.)
   
4. **Performance**
   - Algorithmic efficiency
   - Database queries optimization
   - Caching strategies
   - Bundle size concerns
   
5. **Error Handling**
   - Exception handling completeness
   - Edge case coverage
   - User-friendly error messages
   
6. **Testing**
   - Test coverage assessment
   - Test quality and patterns
   - Missing critical test scenarios
   
7. **Documentation**
   - Code comments quality
   - README and API documentation
   - Type definitions

## Response Format:

Structure your response in the following sections:

### 1. Overall Assessment
Provide a high-level summary of the codebase quality and main concerns.

### 2. Strengths
Highlight what the codebase does well.

### 3. Critical Issues (P0)
List any security vulnerabilities, data loss risks, or major bugs that need immediate attention.

### 4. High Priority Improvements (P1)
Significant issues that impact functionality or maintainability.

### 5. Medium Priority Suggestions (P2)
Moderate improvements for better code quality.

### 6. Low Priority Enhancements (P3)
Nice-to-have improvements and best practices.

### 7. Specific Recommendations
Provide detailed recommendations with code examples where applicable. Reference specific files and line numbers when possible.

## Guidelines:
- Be constructive and specific
- Provide code examples for improvements
- Reference exact file paths
- Explain WHY something should be changed
- Prioritize by impact
- Acknowledge good practices
- Be respectful and professional`;

/**
 * System prompt for code modification
 */
export const CODE_MODIFICATION_SYSTEM_PROMPT = `You are an expert software engineer tasked with making specific, targeted changes to a codebase based on user instructions.

## Your Task:
Make ONLY the changes requested by the user. Be precise and minimal - only modify what is necessary to accomplish the request.

## Important Rules:
1. **Minimal Changes**: Only change what is explicitly requested
2. **Maintain Consistency**: Follow existing code style and patterns
3. **No Breaking Changes**: Ensure all modifications are backward compatible unless explicitly requested
4. **Complete Files**: When modifying a file, return the COMPLETE file content, not just the diff
5. **Preserve Structure**: Don't reorganize or refactor unrelated code
6. **Type Safety**: Maintain TypeScript types and interfaces
7. **Error Handling**: Add proper error handling for new code

## Response Format:

For each file you need to modify, use this exact format:

\`\`\`
[FILE: path/to/file.ext]
[ACTION: modify]
[CONTENT]
// Complete file content here
[/CONTENT]
[/FILE]
\`\`\`

For new files:

\`\`\`
[FILE: path/to/new-file.ext]
[ACTION: create]
[CONTENT]
// Complete file content here
[/CONTENT]
[/FILE]
\`\`\`

For deletions:

\`\`\`
[FILE: path/to/file-to-delete.ext]
[ACTION: delete]
[/FILE]
\`\`\`

## Example:

\`\`\`
[FILE: src/utils/validation.ts]
[ACTION: modify]
[CONTENT]
import { z } from "zod";

export const userSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive().max(150),
});

export type UserInput = z.infer<typeof userSchema>;
[/CONTENT]
[/FILE]
\`\`\`

## After Changes:
Provide a brief summary of:
1. Files modified
2. Changes made
3. Any potential impacts or considerations
4. Suggested commit message`;

/**
 * Build context for code review
 */
export function buildReviewContext(
  fileContents: FileContent[],
  fileTree: FileTree[],
  customPrompt?: string
): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: CODE_REVIEW_SYSTEM_PROMPT,
    },
  ];

  // Build user message with file contents
  let userMessage = `Please review the following codebase.\n\n`;
  userMessage += `## Repository Structure:\n\n`;
  userMessage += formatFileTree(fileTree, "", 0);
  userMessage += `\n\n## File Contents:\n\n`;

  for (const file of fileContents) {
    userMessage += `\n### ${file.path}\n\n`;
    userMessage += `\`\`\`${getFileExtension(file.path)}\n`;
    userMessage += file.content;
    userMessage += `\n\`\`\`\n`;
  }

  if (customPrompt) {
    userMessage += `\n\n## Additional Instructions:\n\n${customPrompt}\n`;
  }

  messages.push({
    role: "user",
    content: userMessage,
  });

  return messages;
}

/**
 * Build context for code modification
 */
export function buildModificationContext(
  fileContents: FileContent[],
  fileTree: FileTree[],
  userPrompt: string
): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: CODE_MODIFICATION_SYSTEM_PROMPT,
    },
  ];

  // Build user message with current file contents and instructions
  let userMessage = `## Current Codebase:\n\n`;

  for (const file of fileContents) {
    userMessage += `\n### ${file.path}\n\n`;
    userMessage += `\`\`\`${getFileExtension(file.path)}\n`;
    userMessage += file.content;
    userMessage += `\n\`\`\`\n`;
  }

  userMessage += `\n\n## Requested Changes:\n\n${userPrompt}\n\n`;
  userMessage += `Please make these changes following the instructions above. `;
  userMessage += `Return only the files that need to be modified or created.`;

  messages.push({
    role: "user",
    content: userMessage,
  });

  return messages;
}

/**
 * Format file tree as string
 */
function formatFileTree(
  tree: FileTree[],
  prefix: string,
  maxDepth: number,
  currentDepth: number = 0
): string {
  if (currentDepth >= maxDepth) return "";

  let result = "";

  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    const isLast = i === tree.length - 1;
    const connector = isLast ? "└── " : "├── ";

    if (node.type === "file") {
      result += `${prefix}${connector}${node.name}\n`;
    } else {
      result += `${prefix}${connector}📁 ${node.name}/\n`;
      if (node.children) {
        result += formatFileTree(
          node.children,
          prefix + (isLast ? "    " : "│   "),
          maxDepth,
          currentDepth + 1
        );
      }
    }
  }

  return result;
}

/**
 * Get file extension for syntax highlighting
 */
function getFileExtension(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const extensionMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    json: "json",
    md: "markdown",
    yml: "yaml",
    yaml: "yaml",
    sql: "sql",
    sh: "bash",
    css: "css",
    scss: "scss",
    html: "html",
    xml: "xml",
    toml: "toml",
  };

  return extensionMap[ext || ""] || "";
}

/**
 * Estimate total tokens for context
 */
export function estimateContextTokens(
  fileContents: FileContent[],
  systemPrompt: string
): number {
  // Rough estimation: 1 token ≈ 4 characters
  const systemTokens = systemPrompt.length / 4;
  const fileTokens = fileContents.reduce(
    (sum, file) => sum + file.content.length / 4 + file.path.length / 4,
    0
  );
  const structureTokens =
    fileContents.length * 20; // Approximation for formatting

  return Math.ceil(systemTokens + fileTokens + structureTokens);
}

/**
 * Truncate file contents to fit within token limits
 */
export function truncateToTokenLimit(
  fileContents: FileContent[],
  maxTokens: number,
  systemPrompt: string
): FileContent[] {
  const systemTokens = systemPrompt.length / 4;
  const availableTokens = maxTokens - systemTokens - 500; // Reserve 500 tokens for response

  const result: FileContent[] = [];
  let usedTokens = 0;

  for (const file of fileContents) {
    const fileTokens = file.content.length / 4 + file.path.length / 4;

    if (usedTokens + fileTokens <= availableTokens) {
      result.push(file);
      usedTokens += fileTokens;
    } else {
      // Truncate file if it would exceed limit
      const remainingTokens = availableTokens - usedTokens;
      if (remainingTokens > 100) {
        // Only include if we can fit at least 100 tokens
        const maxChars = Math.floor(remainingTokens * 4);
        result.push({
          ...file,
          content:
            file.content.slice(0, maxChars) +
            "\n\n// ... [truncated due to length] ...",
        });
      }
      break;
    }
  }

  return result;
}
