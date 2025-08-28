'use client';

import { useState } from 'react';
import { X, FolderOpen, Hash, Plus, Minus, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Folder {
  id: string;
  name: string;
  parent_id?: string;
}

interface BulkMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (folderId: string | null) => void;
  folders: Folder[];
  selectedCount: number;
}

export function BulkMoveModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  folders,
  selectedCount 
}: BulkMoveModalProps) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Move {selectedCount} Prompts</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Select a folder to move the selected prompts
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-2">
            <button
              onClick={() => setSelectedFolder(null)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                selectedFolder === null 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' 
                  : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-gray-100">Root (No folder)</span>
              </div>
            </button>
            
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selectedFolder === folder.id 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' 
                    : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">{folder.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-neutral-800">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm(selectedFolder);
              onClose();
            }}
            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
          >
            Move Prompts
          </Button>
        </div>
      </div>
    </div>
  );
}

interface BulkTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: 'add' | 'remove', tags: string[]) => void;
  availableTags: string[];
  selectedCount: number;
}

export function BulkTagModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  availableTags,
  selectedCount 
}: BulkTagModalProps) {
  const [action, setAction] = useState<'add' | 'remove'>('add');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [newTag, setNewTag] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);

  if (!isOpen) return null;

  const allTags = [...availableTags, ...customTags];

  const handleAddCustomTag = () => {
    if (newTag && !allTags.includes(newTag)) {
      setCustomTags([...customTags, newTag]);
      setSelectedTags(new Set([...selectedTags, newTag]));
      setNewTag('');
    }
  };

  const toggleTag = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setSelectedTags(newTags);
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Tags for {selectedCount} Prompts</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Add or remove tags from selected prompts
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Action Selection */}
          <div className="flex gap-2">
            <button
              onClick={() => setAction('add')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                action === 'add'
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-2 border-green-500 dark:border-green-600'
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 border-2 border-transparent'
              }`}
            >
              <Plus className="inline-block w-4 h-4 mr-2" />
              Add Tags
            </button>
            <button
              onClick={() => setAction('remove')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                action === 'remove'
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-2 border-red-500 dark:border-red-600'
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 border-2 border-transparent'
              }`}
            >
              <Minus className="inline-block w-4 h-4 mr-2" />
              Remove Tags
            </button>
          </div>

          {/* New Tag Input (only for add action) */}
          {action === 'add' && (
            <div className="flex gap-2">
              <Input
                placeholder="Create new tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
                className="flex-1"
              />
              <Button
                onClick={handleAddCustomTag}
                size="sm"
                disabled={!newTag}
              >
                Add
              </Button>
            </div>
          )}

          {/* Tag Selection */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Select tags to {action}:
            </p>
            {allTags.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                {action === 'add' ? 'Create tags above to add them' : 'No tags available to remove'}
              </p>
            ) : (
              <div className="space-y-1">
                {allTags.map((tag, index) => (
                  <label
                    key={`${tag}-${index}`}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTags.has(tag)}
                      onChange={() => toggleTag(tag)}
                      className="mr-3 rounded border-gray-300"
                    />
                    <Hash className="w-4 h-4 mr-1 text-gray-400" />
                    <span className="text-sm">{tag}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedTags.size > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-neutral-950 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Will {action} {selectedTags.size} tag{selectedTags.size !== 1 ? 's' : ''}:
              </p>
              <div className="flex flex-wrap gap-1">
                {Array.from(selectedTags).map(tag => (
                  <span 
                    key={tag}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      action === 'add' 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                        : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    }`}
                  >
                    <Hash className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-neutral-800">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm(action, Array.from(selectedTags));
              onClose();
            }}
            disabled={selectedTags.size === 0}
            className={`flex-1 text-white ${
              action === 'add' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {action === 'add' ? 'Add' : 'Remove'} Tags
          </Button>
        </div>
      </div>
    </div>
  );
}

interface BulkShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (shareType: 'team' | 'workspace', message?: string) => void;
  selectedCount: number;
}

export function BulkShareModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  selectedCount 
}: BulkShareModalProps) {
  const [shareType, setShareType] = useState<'team' | 'workspace'>('team');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Share {selectedCount} Prompts</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Share selected prompts with your team or workspace
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Share Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Share with:
            </label>
            <div className="space-y-2">
              <label className="flex items-center px-4 py-3 border border-gray-200 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800">
                <input
                  type="radio"
                  name="shareType"
                  value="team"
                  checked={shareType === 'team'}
                  onChange={() => setShareType('team')}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Your Team</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Share with all team members in this workspace
                  </div>
                </div>
              </label>
              <label className="flex items-center px-4 py-3 border border-gray-200 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800">
                <input
                  type="radio"
                  name="shareType"
                  value="workspace"
                  checked={shareType === 'workspace'}
                  onChange={() => setShareType('workspace')}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Public Workspace</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Make available to everyone in the workspace
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Optional Message */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Add a message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Let others know why you're sharing these prompts..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Sharing {selectedCount} prompt{selectedCount !== 1 ? 's' : ''} will make {selectedCount !== 1 ? 'them' : 'it'} accessible to {shareType === 'team' ? 'all team members' : 'everyone in the workspace'}.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-neutral-800">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm(shareType, message);
              onClose();
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Share {selectedCount} Prompts
          </Button>
        </div>
      </div>
    </div>
  );
}

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
}

export function BulkDeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  selectedCount 
}: BulkDeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen) return null;

  const isConfirmed = confirmText.toLowerCase() === 'delete';

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-red-600">Delete {selectedCount} Prompts</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              This action cannot be undone
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> You are about to permanently delete {selectedCount} prompt{selectedCount !== 1 ? 's' : ''}. 
              This will also delete all associated versions and history.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Type "delete" to confirm
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type 'delete' to confirm"
              className={confirmText && !isConfirmed ? 'border-red-300' : ''}
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-neutral-800">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
              setConfirmText('');
            }}
            disabled={!isConfirmed}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300"
          >
            Delete {selectedCount} Prompts
          </Button>
        </div>
      </div>
    </div>
  );
}