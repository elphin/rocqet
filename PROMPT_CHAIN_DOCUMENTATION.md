# 🔗 ROCQET Prompt Chain System - Complete Documentation

## Overview
The ROCQET Prompt Chain system enables users to create powerful, sequential workflows by connecting multiple prompts together. Each prompt's output can flow into the next, creating sophisticated AI pipelines for complex tasks.

---

## 🎯 Core Concepts

### What is a Prompt Chain?
A prompt chain is a sequence of AI prompts that execute in order, where each step can:
- Use the output from the previous step as input
- Access the original input variables
- Override model settings per step
- Transform and process data through multiple stages

### Key Benefits
- **Modularity**: Reuse existing prompts in different combinations
- **Flexibility**: Each step can use different AI models optimized for specific tasks
- **Traceability**: Full audit trail of all executions with inputs/outputs per step
- **Cost Tracking**: Monitor token usage and costs across the entire chain

---

## 🏗️ Chain Builder Features

### 1. Basic Chain Configuration

#### Chain Properties
- **Name**: Descriptive name for the chain
- **Description**: Explanation of what the chain accomplishes
- **URL Slug**: Auto-generated, editable URL-friendly identifier
- **Tags**: Categorization for easy discovery

#### Documentation Tab (Optional)
- **When to Use**: Scenarios where this chain is most effective
- **Expected Output**: Description of what the chain produces
- **Requirements**: Prerequisites or dependencies
- **Examples**: Sample inputs and outputs

### 2. Step Management

#### Adding Steps
- Click "Add Step" to append a new step to the chain
- Each step requires selecting a prompt from your workspace
- Steps are executed sequentially in the order shown

#### Step Configuration
Each step includes:
- **Prompt Selection**: Search and select from available workspace prompts
- **Step Name**: Optional custom name (defaults to "Step N")
- **Order Control**: Drag-and-drop or arrow buttons to reorder
- **Delete Option**: Remove steps that are no longer needed

### 3. Model Configuration

#### Default Behavior
- Each prompt comes with its own pre-configured model settings
- By default, chains use the prompt's original model configuration
- This ensures prompts work with their optimized models

#### Model Override Feature
For each step, you can:
1. **Use Prompt Default** (Recommended)
   - Shows current model: e.g., "Uses prompt's default model: gpt-4"
   - Respects the prompt creator's optimization choices

2. **Override Settings** (Advanced)
   - Click the settings icon (⚙️) next to the model info
   - When activated (amber color), reveals override options:
     - **Provider Selection**: OpenAI, Anthropic, Google AI, Cohere, etc.
     - **Model Selection**: Provider-specific models
     - **Warning**: Shows performance impact notice
   - Useful for testing different models or specific requirements

### 4. Variable Management

#### Input Variables
- **Automatic Detection**: System scans first prompt for `{{variable}}` patterns
- **Variable Types Supported**:
  - Standard: `{{input}}`, `{{query}}`, `{{data}}`
  - Custom: Any alphanumeric with underscores/hyphens
  - Case-insensitive matching

#### Output Flow Options
Each step can be configured for data flow:

1. **Use Previous Output** (Default)
   - Automatically passes previous step's output to next step
   - Creates a transformation pipeline
   - Variables like `{{output}}`, `{{previousOutput}}` auto-map

2. **Use Original Input**
   - Checkbox: "Use original input instead of previous output"
   - Bypasses previous outputs, uses initial chain input
   - Useful for parallel processing patterns

3. **Custom Variable Mapping**
   - Map specific variables to previous outputs
   - Reference syntax: `{{step1.output}}`, `{{input.originalVar}}`
   - Mix and match different data sources

---

## 🚀 Chain Execution

### Running a Chain

#### Input Requirements
1. **Variable Values**: Fill in all detected variables from the first prompt
2. **Validation**: System checks for missing required variables
3. **Multi-line Support**: Text areas for longer inputs

#### Execution Process
1. **Initialization**:
   - Creates a chain run record in the database
   - Sets status to "running"
   - Captures start time and user info

2. **Step-by-Step Processing**:
   - Visual progress indicator shows current step
   - Each step shows: ⏳ (running) → ✅ (completed)
   - Real-time status updates

3. **Data Flow**:
   - Step 1: Uses provided input variables
   - Step 2+: Can use previous output or original input
   - Variable substitution happens automatically

4. **Completion**:
   - Shows all step outputs in order
   - Stores complete execution record
   - Updates chain statistics

### Execution Tracking

#### Per-Step Metrics
- Input variables used
- Output generated
- Token count
- Processing time
- Cost (if applicable)

#### Chain-Level Metrics
- Total execution time (milliseconds)
- Total tokens consumed
- Total cost (in cents)
- Success/failure status
- Error details (if failed)

---

## 📊 Chain Run History

### Stored Information
Every chain execution saves:
- **Inputs**: Initial variables provided
- **Outputs**: Final result and intermediate steps
- **Step Results**: Detailed array with:
  - Step index and prompt ID
  - Input/output for each step
  - Tokens and cost per step
  - Execution timestamp
- **Performance Metrics**:
  - Total tokens used
  - Total cost in cents
  - Execution time in milliseconds
- **Status Tracking**:
  - pending/running/completed/failed
  - Error messages and failed step indicator

### Statistics Updates
After each run:
- Increments chain's `run_count`
- Updates `last_run_at` timestamp
- Provides data for analytics

---

## 🎨 UI/UX Features

### Visual Indicators

#### Step Status
- **Gray**: Not yet executed
- **Blue (pulsing)**: Currently executing
- **Green**: Successfully completed
- **Red**: Failed

#### Model Override
- **Gray settings icon**: Using default model
- **Amber settings icon**: Override active
- **Tooltip on hover**: Explains current state

### Empty States
- Clear messaging when no steps added
- Prominent "Add First Step" CTA
- Helpful placeholder text

### Responsive Design
- Mobile-friendly interface
- Collapsible step details
- Expandable documentation section

---

## 🔧 Advanced Features

### 1. Complex Variable Mapping
```
Step 1: {{userInput}} → generates article
Step 2: {{previousOutput}} → summarizes article  
Step 3: {{step1.output}} + {{step2.output}} → combines both
```

### 2. Conditional Model Selection
- Use GPT-4 for complex reasoning steps
- Use Claude for creative writing steps
- Use Gemini for data analysis steps

### 3. Parallel-like Processing
Multiple steps can reference the original input:
```
Step 1: Analyze sentiment of {{input}}
Step 2: Extract entities from {{input}}  
Step 3: Combine {{step1.output}} and {{step2.output}}
```

### 4. Provider-Specific Features
Each provider offers unique capabilities:
- **OpenAI**: Function calling, JSON mode
- **Anthropic**: Larger context windows
- **Google**: Multimodal capabilities
- **Cohere**: Specialized retrieval models

---

## 🛡️ Security & Permissions

### Access Control
- Chains inherit workspace permissions
- Only workspace members can create/edit chains
- Role-based access (owner, admin, editor, viewer)

### API Key Management
- Uses workspace-level API keys
- Secure storage in encrypted format
- Per-provider key configuration

---

## 💡 Best Practices

### 1. Prompt Selection
- Choose prompts optimized for specific tasks
- Avoid model overrides unless necessary
- Test prompts individually before chaining

### 2. Chain Design
- Keep chains focused on a single workflow
- Use descriptive names for steps
- Document expected inputs/outputs

### 3. Performance Optimization
- Minimize token usage in intermediate steps
- Use appropriate models for each task
- Consider cost vs. quality tradeoffs

### 4. Error Handling
- Test chains with various inputs
- Add validation in individual prompts
- Monitor failed runs for patterns

---

## 🎯 Use Cases

### Content Creation Pipeline
```
Step 1: Research (GPT-4) → Gather information
Step 2: Outline (Claude) → Structure content
Step 3: Write (GPT-4) → Generate full article
Step 4: Edit (Claude) → Polish and refine
```

### Data Processing Workflow
```
Step 1: Extract (GPT-3.5) → Pull data from text
Step 2: Transform (Gemini) → Restructure data
Step 3: Analyze (GPT-4) → Generate insights
Step 4: Report (Claude) → Create summary
```

### Customer Service Chain
```
Step 1: Classify (GPT-3.5) → Categorize inquiry
Step 2: Research (GPT-4) → Find relevant info
Step 3: Respond (Claude) → Draft response
Step 4: Personalize (GPT-3.5) → Add personal touch
```

---

## 🚧 Limitations

### Technical Constraints
- Maximum 20 steps per chain (configurable)
- Output size limits per step (model-dependent)
- Timeout after 5 minutes total execution
- No conditional branching (sequential only)

### Cost Considerations
- Each step incurs API costs
- Longer chains multiply token usage
- Model selection impacts pricing

---

## 🔮 Future Enhancements (Roadmap)

### Planned Features
- **Conditional Logic**: If-then-else branching
- **Parallel Execution**: Run steps simultaneously
- **Loop Support**: Iterate over arrays
- **External Integrations**: Webhooks, APIs
- **Scheduled Runs**: Cron-based execution
- **Chain Templates**: Pre-built workflow library
- **Visual Chain Designer**: Drag-and-drop interface
- **Chain Versioning**: Git-style version control

---

## 📝 Summary

The ROCQET Prompt Chain system transforms simple prompts into powerful workflows. By combining modular prompts with flexible configuration options, users can build sophisticated AI pipelines that handle complex, multi-stage tasks efficiently and reliably.

Key takeaways:
- **Modular**: Reuse prompts across different chains
- **Flexible**: Override models when needed
- **Traceable**: Complete audit trail of executions
- **Scalable**: From simple 2-step chains to complex workflows
- **Cost-Effective**: Monitor and optimize token usage

The system balances power with simplicity, making advanced AI workflows accessible to all users while providing the flexibility experts need.