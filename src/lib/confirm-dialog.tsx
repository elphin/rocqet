import React from 'react';
import { toast } from './toast-config';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

// Create a promise-based confirm dialog using toast
export const confirm = (options: ConfirmOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    const toastId = toast.custom(
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-2">{options.title}</h3>
        {options.description && (
          <p className="text-sm text-gray-600 mb-4">{options.description}</p>
        )}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              toast.dismiss(toastId);
              resolve(false);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            {options.cancelText || 'Cancel'}
          </button>
          <button
            onClick={() => {
              toast.dismiss(toastId);
              resolve(true);
            }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              options.variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-gray-900 hover:bg-gray-800 focus:ring-gray-500'
            }`}
          >
            {options.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    );
  });
};