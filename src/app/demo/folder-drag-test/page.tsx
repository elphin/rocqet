'use client';

import { FolderTreeDraggable } from '@/components/folder-tree-draggable';
import { useState } from 'react';
import { Reorder, motion } from 'framer-motion';

// Test data
const mockFolders = [
  { id: '1', name: 'Marketing', parent_id: null, workspace_id: 'test', prompt_count: 5, order: 0 },
  { id: '2', name: 'Development', parent_id: null, workspace_id: 'test', prompt_count: 12, order: 1 },
  { id: '3', name: 'Sales', parent_id: null, workspace_id: 'test', prompt_count: 8, order: 2 },
  { id: '4', name: 'HR', parent_id: null, workspace_id: 'test', prompt_count: 3, order: 3 },
  { id: '5', name: 'Finance', parent_id: null, workspace_id: 'test', prompt_count: 7, order: 4 },
];

// Super simple test
const SimpleList = () => {
  const [items, setItems] = useState(['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5']);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Simple Drag Test</h3>
      <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
        {items.map(item => (
          <Reorder.Item key={item} value={item}>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileDrag={{ scale: 1.05 }}
              className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg cursor-move flex items-center gap-2"
            >
              <div className="w-1 h-8 bg-neutral-300 dark:bg-neutral-600 rounded" />
              <span className="font-medium">{item}</span>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
};

// Lightweight test (minimal DOM)
const LightweightList = () => {
  const [items, setItems] = useState(['A', 'B', 'C', 'D', 'E']);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Lightweight Test</h3>
      <Reorder.Group axis="y" values={items} onReorder={setItems}>
        {items.map(item => (
          <Reorder.Item key={item} value={item}>
            <div className="p-2 cursor-move hover:bg-neutral-100 dark:hover:bg-neutral-800">
              {item}
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
};

// Heavy test (lots of nested elements)
const HeavyList = () => {
  const [items, setItems] = useState([
    { id: '1', name: 'Complex Item 1', description: 'With lots of nested content', tags: ['tag1', 'tag2'] },
    { id: '2', name: 'Complex Item 2', description: 'More complex content here', tags: ['tag3', 'tag4'] },
    { id: '3', name: 'Complex Item 3', description: 'Even more complexity', tags: ['tag5', 'tag6'] },
  ]);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Heavy DOM Test</h3>
      <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-3">
        {items.map(item => (
          <Reorder.Item key={item.id} value={item}>
            <motion.div
              whileDrag={{ scale: 1.02 }}
              className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg cursor-move"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{item.name}</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.description}</p>
                  <div className="flex gap-2 mt-2">
                    {item.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded">Edit</button>
                  <button className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded">Delete</button>
                </div>
              </div>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
};

export default function FolderDragTestPage() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Drag & Drop Performance Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Simple Test */}
          <SimpleList />
          
          {/* Lightweight Test */}
          <LightweightList />
          
          {/* Heavy Test */}
          <HeavyList />
          
          {/* Folder Tree Test */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Folder Tree Test</h3>
            <FolderTreeDraggable
              workspaceId="test"
              selectedFolderId={selectedFolder}
              onFolderSelect={setSelectedFolder}
              onReorderFolders={(folders) => {
                console.log('Folders reordered:', folders);
              }}
              mockData={mockFolders}
            />
          </div>
        </div>
        
        <div className="mt-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
          <h3 className="font-semibold mb-2">Performance Notes:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Simple: Basic elements, should be very smooth</li>
            <li>Lightweight: Minimal DOM, testing raw performance</li>
            <li>Heavy: Complex nested elements, similar to chain builder</li>
            <li>Folder Tree: Real-world component with moderate complexity</li>
          </ul>
        </div>
      </div>
    </div>
  );
}