/**
 * Parse variables from prompt content
 * Supports both formats:
 * - {{variable_name}} - without default
 * - {{variable_name:default_value}} - with default value
 */

export interface ParsedVariable {
  name: string;
  defaultValue?: string;
  fullMatch: string;
}

export function parseVariables(content: string): ParsedVariable[] {
  // Regex to match {{variable}} or {{variable:default}}
  // Captures: variable name and optional default value after colon
  const regex = /\{\{([^:}]+)(?::([^}]+))?\}\}/g;
  
  const variables: ParsedVariable[] = [];
  const seen = new Set<string>();
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1].trim();
    const defaultValue = match[2]?.trim();
    
    // Avoid duplicates
    if (!seen.has(name)) {
      seen.add(name);
      variables.push({
        name,
        defaultValue,
        fullMatch: match[0]
      });
    }
  }
  
  return variables;
}

/**
 * Get just the variable names (for backward compatibility)
 */
export function getVariableNames(content: string): string[] {
  return parseVariables(content).map(v => v.name);
}

/**
 * Replace variables in content with their values
 * Handles both {{var}} and {{var:default}} formats
 */
export function replaceVariables(
  content: string, 
  values: Record<string, string>
): string {
  return content.replace(/\{\{([^:}]+)(?::([^}]+))?\}\}/g, (match, varName, defaultValue) => {
    const name = varName.trim();
    const value = values[name];
    
    // Use provided value, or default, or keep original if neither exists
    if (value !== undefined && value !== '') {
      return value;
    } else if (defaultValue !== undefined) {
      return defaultValue.trim();
    } else {
      return match; // Keep original if no value and no default
    }
  });
}

/**
 * Extract default values from parsed variables
 */
export function extractDefaults(variables: ParsedVariable[]): Record<string, string> {
  const defaults: Record<string, string> = {};
  
  variables.forEach(v => {
    if (v.defaultValue) {
      defaults[v.name] = v.defaultValue;
    }
  });
  
  return defaults;
}