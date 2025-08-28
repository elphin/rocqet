# Chain Input Variables Guide

## How to Reference Initial Input in Chain Prompts

When creating a chain in ROCQET, the first prompt needs to receive input from the user. Here's how it works:

## Quick Answer

In your first prompt, use `{{input}}` or any custom variable name like `{{text}}`, `{{query}}`, `{{content}}` etc.

## Detailed Explanation

### 1. Default Input Variable

If your first prompt contains `{{input}}`:
```
Analyze the following text and extract key points:
{{input}}
```

When running the chain, whatever you type in the "General Input" field will be substituted for `{{input}}`.

### 2. Named Variables

If your first prompt uses specific variable names:
```
Blog Title: {{title}}
Blog Content: {{content}}
Target Audience: {{audience}}
```

The chain runner will:
- Detect these variables automatically
- Show individual input fields for each variable
- Map your inputs to the corresponding variables

### 3. Fallback Behavior

If your prompt uses any variable (e.g., `{{text}}`) but you only provide general input:
- The general input will be used as a fallback for that variable
- This ensures your chain always works, even with simple input

## Example Chains

### Example 1: Simple Analysis Chain

**Prompt 1: "Analyze Text"**
```
Analyze this text for sentiment and key themes:
{{input}}
```

**Prompt 2: "Generate Summary"**
```
Based on the analysis: {{previousOutput}}
Create a concise summary.
```

**How to run:** Just paste your text in the "General Input" field.

### Example 2: Blog Improvement Chain

**Prompt 1: "Analyze Blog"**
```
Review this blog post:
Title: {{title}}
Content: {{content}}

Identify areas for improvement.
```

**Prompt 2: "Rewrite Blog"**
```
Based on the analysis: {{previousOutput}}
Rewrite the blog post with improvements.
```

**How to run:** The chain will show two fields:
- Title: [Enter blog title]
- Content: [Enter blog content]

### Example 3: Multi-Step Content Chain

**Prompt 1: "Extract Keywords"**
```
Extract keywords from: {{text}}
```

**Prompt 2: "Generate Headlines"**
```
Using keywords: {{previousOutput}}
Generate 5 compelling headlines.
```

**Prompt 3: "Write Article"**
```
Using the best headline from: {{previousOutput}}
Write a full article.
```

**How to run:** Enter your source text in the field labeled "text".

## Variable Mapping in Subsequent Steps

After the first step, you can:
- Use `{{previousOutput}}` to reference the output from the previous step
- Use `{{input.variableName}}` to reference the original input variables
- Map variables in the chain builder interface

## Best Practices

1. **Be Consistent**: Use the same variable names across similar prompts
2. **Use Descriptive Names**: `{{blogContent}}` is clearer than `{{text}}`
3. **Provide Examples**: In your prompt, show example input format
4. **Document Requirements**: Use the prompt description to explain what input is expected

## UI Indicators

The chain runner shows:
- ✅ Green when variables are detected and mapped
- ⚠️ Yellow warning when no variables are found (can still use general input)
- ❌ Red when required variables are missing

## Common Patterns

### Pattern 1: Simple Input/Output
```
First prompt: {{input}}
Subsequent prompts: {{previousOutput}}
```

### Pattern 2: Multi-Variable Start
```
First prompt: {{title}}, {{content}}, {{style}}
Second prompt: {{previousOutput}} + {{input.style}}
```

### Pattern 3: Context Preservation
```
First prompt: Analyze {{document}}
Second prompt: Based on {{previousOutput}} and original {{input.document}}
```

## Troubleshooting

**Q: My first prompt doesn't accept input**
A: Make sure you have at least one variable like `{{input}}` or `{{yourVariableName}}` in the prompt.

**Q: The input field doesn't appear**
A: Check that your variable is properly formatted with double curly braces: `{{variableName}}`

**Q: Can I use multiple variables?**
A: Yes! Use as many as needed: `{{var1}}`, `{{var2}}`, etc.

**Q: What if I don't define variables?**
A: You can still provide general input, which will be available as `{{input}}` if needed.