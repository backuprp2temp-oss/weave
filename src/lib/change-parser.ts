export interface FileChange {
  path: string;
  action: "create" | "modify" | "delete";
  content?: string;
}

export interface ParsedChanges {
  files: FileChange[];
  summary?: string;
  commitMessage?: string;
}

/**
 * Parse LLM response to extract file changes
 */
export function parseChanges(response: string): ParsedChanges {
  const changes: FileChange[] = [];
  const fileRegex = /\[FILE:\s*(.+?)\]\s*\n\[ACTION:\s*(create|modify|delete)\]\s*\n(?:\[CONTENT\]\s*\n([\s\S]*?)\n\[\/CONTENT\]\s*\n)?\[\/FILE\]/g;

  let match;
  while ((match = fileRegex.exec(response)) !== null) {
    const path = match[1].trim();
    const action = match[2] as "create" | "modify" | "delete";
    const content = match[3]?.trim();

    if (action === "delete") {
      changes.push({ path, action });
    } else if (content) {
      changes.push({ path, action, content });
    }
  }

  // Extract summary if present
  const summaryMatch = response.match(/## Summary[\s\S]*?$/i);
  const summary = summaryMatch ? summaryMatch[0] : undefined;

  // Extract commit message suggestion
  const commitMsgMatch = response.match(
    /Suggested commit message[:\s]*\n(.+?)(?:\n|$)/i
  );
  const commitMessage = commitMsgMatch ? commitMsgMatch[1].trim() : undefined;

  return {
    files: changes,
    summary,
    commitMessage: commitMessage || "AI-assisted code changes",
  };
}

/**
 * Validate parsed changes
 */
export function validateChanges(changes: ParsedChanges): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (changes.files.length === 0) {
    errors.push("No file changes found in response");
    return { valid: false, errors };
  }

  for (const file of changes.files) {
    // Validate file path
    if (!file.path || file.path.trim() === "") {
      errors.push(`Invalid file path: ${file.path}`);
      continue;
    }

    // Check for dangerous paths
    const dangerousPaths = ["../", "..\\", "/etc/", "/root/", "/home/"];
    if (dangerousPaths.some((dp) => file.path.includes(dp))) {
      errors.push(`Dangerous file path: ${file.path}`);
      continue;
    }

    // Validate content for create/modify actions
    if (file.action !== "delete" && !file.content) {
      errors.push(`No content provided for ${file.action}: ${file.path}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format changes for display
 */
export function formatChangesForDisplay(changes: ParsedChanges): string {
  if (changes.files.length === 0) {
    return "No changes to display";
  }

  let output = `## Files Changed (${changes.files.length})\n\n`;

  for (const file of changes.files) {
    const actionEmoji =
      file.action === "create"
        ? "✨"
        : file.action === "modify"
          ? "✏️"
          : "🗑️";
    output += `${actionEmoji} **${file.action.toUpperCase()}**: \`${file.path}\`\n`;
  }

  if (changes.commitMessage) {
    output += `\n**Suggested Commit Message:** ${changes.commitMessage}\n`;
  }

  return output;
}

/**
 * Count files by action type
 */
export function countChangesByAction(changes: ParsedChanges): {
  created: number;
  modified: number;
  deleted: number;
} {
  return {
    created: changes.files.filter((f) => f.action === "create").length,
    modified: changes.files.filter((f) => f.action === "modify").length,
    deleted: changes.files.filter((f) => f.action === "delete").length,
  };
}
