'use client';

import { useState, useEffect } from 'react';
import { 
  Info, 
  AlertTriangle, 
  Link2, 
  Code, 
  FileText,
  Plus,
  X,
  Save,
  BookOpen,
  Lightbulb,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PromptDocumentationProps {
  promptId?: string;
  initialData?: {
    whenToUse?: string;
    exampleInput?: any;
    exampleOutput?: string;
    requirements?: string[];
    warnings?: string[];
    relatedPrompts?: string[];
  };
  onChange?: (data: any) => void;
  readOnly?: boolean;
}

export function PromptDocumentation({ 
  promptId,
  initialData = {},
  onChange,
  readOnly = false
}: PromptDocumentationProps) {
  const [whenToUse, setWhenToUse] = useState(initialData.whenToUse || '');
  const [exampleInput, setExampleInput] = useState(
    typeof initialData.exampleInput === 'object' 
      ? JSON.stringify(initialData.exampleInput, null, 2)
      : initialData.exampleInput || '{}'
  );
  const [exampleOutput, setExampleOutput] = useState(initialData.exampleOutput || '');
  const [requirements, setRequirements] = useState<string[]>(initialData.requirements || []);
  const [warnings, setWarnings] = useState<string[]>(initialData.warnings || []);
  const [relatedPrompts, setRelatedPrompts] = useState<string[]>(initialData.relatedPrompts || []);
  
  // UI state
  const [newRequirement, setNewRequirement] = useState('');
  const [newWarning, setNewWarning] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Notify parent of changes
  useEffect(() => {
    if (!onChange) return;
    
    let parsedInput;
    try {
      parsedInput = JSON.parse(exampleInput);
      setJsonError(null);
    } catch (e) {
      setJsonError('Invalid JSON format');
      parsedInput = {};
    }

    onChange({
      whenToUse,
      exampleInput: parsedInput,
      exampleOutput,
      requirements,
      warnings,
      relatedPrompts
    });
  }, [whenToUse, exampleInput, exampleOutput, requirements, warnings, relatedPrompts]);

  const addRequirement = () => {
    if (newRequirement.trim() && !requirements.includes(newRequirement.trim())) {
      setRequirements([...requirements, newRequirement.trim()]);
      setNewRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const addWarning = () => {
    if (newWarning.trim() && !warnings.includes(newWarning.trim())) {
      setWarnings([...warnings, newWarning.trim()]);
      setNewWarning('');
    }
  };

  const removeWarning = (index: number) => {
    setWarnings(warnings.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* When to Use */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-gray-200 dark:border-neutral-800">
        <div className="flex items-start gap-3 mb-4">
          <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">When to Use</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Describe the ideal scenarios and use cases for this prompt
            </p>
          </div>
        </div>
        <textarea
          value={whenToUse}
          onChange={(e) => setWhenToUse(e.target.value)}
          placeholder="e.g., Use this prompt when dealing with angry customers who are requesting refunds..."
          className="w-full min-h-[100px] px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
          disabled={readOnly}
        />
      </div>

      {/* Example Input */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-gray-200 dark:border-neutral-800">
        <div className="flex items-start gap-3 mb-4">
          <Code className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Example Input</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Provide a JSON example of variable values
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <textarea
            value={exampleInput}
            onChange={(e) => setExampleInput(e.target.value)}
            placeholder={'{\n  "customer_name": "John Doe",\n  "issue": "Product not delivered",\n  "order_id": "12345"\n}'}
            className={`w-full min-h-[150px] px-3 py-2 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 ${
              jsonError ? 'border-red-500' : 'border-gray-200 dark:border-neutral-700'
            }`}
            disabled={readOnly}
          />
          {jsonError && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {jsonError}
            </p>
          )}
        </div>
      </div>

      {/* Example Output */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-gray-200 dark:border-neutral-800">
        <div className="flex items-start gap-3 mb-4">
          <FileText className="w-5 h-5 text-green-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Example Output</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Show what kind of output to expect
            </p>
          </div>
        </div>
        <textarea
          value={exampleOutput}
          onChange={(e) => setExampleOutput(e.target.value)}
          placeholder="Dear John, We sincerely apologize for the delay in delivering your order..."
          className="w-full min-h-[150px] px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
          disabled={readOnly}
        />
      </div>

      {/* Requirements */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-gray-200 dark:border-neutral-800">
        <div className="flex items-start gap-3 mb-4">
          <Info className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Requirements</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Prerequisites or data needed to use this prompt effectively
            </p>
          </div>
        </div>
        
        {!readOnly && (
          <div className="flex gap-2 mb-3">
            <Input
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addRequirement()}
              placeholder="e.g., Customer order history"
              className="flex-1"
            />
            <Button onClick={addRequirement} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <div className="space-y-2">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{req}</span>
              {!readOnly && (
                <button
                  onClick={() => removeRequirement(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {requirements.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No requirements specified</p>
          )}
        </div>
      </div>

      {/* Warnings */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-gray-200 dark:border-neutral-800">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Warnings</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Important cautions or limitations to be aware of
            </p>
          </div>
        </div>
        
        {!readOnly && (
          <div className="flex gap-2 mb-3">
            <Input
              value={newWarning}
              onChange={(e) => setNewWarning(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addWarning()}
              placeholder="e.g., Do not use for legal matters"
              className="flex-1"
            />
            <Button onClick={addWarning} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <div className="space-y-2">
          {warnings.map((warning, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{warning}</span>
              {!readOnly && (
                <button
                  onClick={() => removeWarning(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {warnings.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No warnings specified</p>
          )}
        </div>
      </div>
    </div>
  );
}