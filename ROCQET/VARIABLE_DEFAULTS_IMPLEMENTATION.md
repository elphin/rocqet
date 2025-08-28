# 🎯 Variable Default Values - Implementation Plan

## Current Situation
- Variables worden automatisch gedetecteerd uit prompt: `{{variable_name}}`
- Database ondersteunt al default values: `[{name, type, defaultValue, description}]`
- UI toont alleen variable namen, geen inputs voor defaults

## Proposed Solution

### 1. Edit Page Enhancement
In de edit form, uitbreiden van "Detected Variables" sectie:

```jsx
{extractedVariables.length > 0 && (
  <div className="bg-primary-pale rounded-lg border border-primary-light p-4">
    <h3 className="text-xs font-medium text-primary-dark mb-3">
      Variable Configuration
    </h3>
    <div className="space-y-3">
      {extractedVariables.map((variable, index) => (
        <div key={index} className="border border-primary-light/50 rounded p-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-primary">
              {{variable}}
            </span>
          </div>
          
          {/* Default Value Input */}
          <input
            type="text"
            placeholder="Default value (optional)"
            value={variableDefaults[variable]?.defaultValue || ''}
            onChange={(e) => updateVariableDefault(variable, 'defaultValue', e.target.value)}
            className="w-full px-2 py-1 text-xs border rounded"
          />
          
          {/* Description Input */}
          <input
            type="text"
            placeholder="Description (optional)"
            value={variableDefaults[variable]?.description || ''}
            onChange={(e) => updateVariableDefault(variable, 'description', e.target.value)}
            className="w-full px-2 py-1 text-xs border rounded mt-1"
          />
          
          {/* Type Selection */}
          <select
            value={variableDefaults[variable]?.type || 'text'}
            onChange={(e) => updateVariableDefault(variable, 'type', e.target.value)}
            className="w-full px-2 py-1 text-xs border rounded mt-1"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="boolean">Boolean</option>
            <option value="json">JSON</option>
          </select>
        </div>
      ))}
    </div>
  </div>
)}
```

### 2. Playground/Test Page Usage
Wanneer variabelen worden geladen:

```jsx
// In playground
useEffect(() => {
  // Load saved variable defaults
  const savedVariables = prompt.variables || [];
  const defaultValues = {};
  
  savedVariables.forEach(v => {
    defaultValues[v.name] = v.defaultValue || '';
  });
  
  setVariables(defaultValues);
}, [prompt]);

// In variable input fields
{detectedVars.map(varName => {
  const varConfig = prompt.variables?.find(v => v.name === varName);
  return (
    <div>
      <label>
        {varName}
        {varConfig?.description && (
          <span className="text-xs text-gray-500 ml-2">
            ({varConfig.description})
          </span>
        )}
      </label>
      <Input
        value={variables[varName] || ''}
        placeholder={varConfig?.defaultValue || `Enter ${varName}...`}
        onChange={(e) => setVariables({...variables, [varName]: e.target.value})}
      />
      {!variables[varName] && varConfig?.defaultValue && (
        <button
          onClick={() => setVariables({...variables, [varName]: varConfig.defaultValue})}
          className="text-xs text-blue-600 mt-1"
        >
          Use default: {varConfig.defaultValue}
        </button>
      )}
    </div>
  );
})}
```

### 3. Database Update
Bij het opslaan van prompt:

```javascript
// Extract variables with their configurations
const variableConfigs = extractedVariables.map(varName => ({
  name: varName,
  type: variableDefaults[varName]?.type || 'text',
  defaultValue: variableDefaults[varName]?.defaultValue || '',
  description: variableDefaults[varName]?.description || ''
}));

// Save to database
await supabase
  .from('prompts')
  .update({
    ...otherFields,
    variables: variableConfigs
  })
  .eq('id', promptId);
```

## Benefits

1. **Sneller testen**: Variabelen hebben al een waarde
2. **Documentatie**: Beschrijving helpt gebruikers
3. **Type safety**: Validatie op variable types
4. **Team collaboration**: Iedereen weet wat variabelen betekenen
5. **Templates**: Default values maken prompt meer template-ready

## Use Cases

### Customer Support Template
```
Prompt: "Reply to {{customer_name}} about {{issue}}"

Variables:
- customer_name: 
  - Default: "Customer"
  - Description: "Name of the customer"
  - Type: text
  
- issue:
  - Default: "their inquiry"
  - Description: "The main issue or question"
  - Type: text
```

### Code Generation
```
Prompt: "Generate a {{language}} function that {{action}}"

Variables:
- language:
  - Default: "JavaScript"
  - Description: "Programming language"
  - Type: select (JavaScript, Python, Java, etc.)
  
- action:
  - Default: "sorts an array"
  - Description: "What the function should do"
  - Type: text
```

## Implementation Priority

1. **Phase 1**: Basic default values (text only)
2. **Phase 2**: Add descriptions
3. **Phase 3**: Add type validation
4. **Phase 4**: Advanced types (select, multiline, json)

This would make ROCQET much more powerful for template creation!