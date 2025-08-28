import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

// Custom toast configurations with icons and colors
export const toast = {
  success: (message: string, descriptionOrOptions?: string | any) => {
    // Handle both old format (string description) and new format (options object)
    const description = typeof descriptionOrOptions === 'string' ? descriptionOrOptions : descriptionOrOptions?.description;
    const options = typeof descriptionOrOptions === 'object' ? descriptionOrOptions : {};
    
    sonnerToast.success(message, {
      description,
      icon: <CheckCircle className="w-5 h-5" />,
      className: 'toast-success',
      duration: options.duration,
      style: {
        background: 'white',
        color: '#065f46',
        border: '1px solid #10b981',
        boxShadow: '0 10px 15px -3px rgb(16 185 129 / 0.1), 0 4px 6px -4px rgb(16 185 129 / 0.1)',
      },
    });
  },
  
  error: (message: string, descriptionOrOptions?: string | any) => {
    const description = typeof descriptionOrOptions === 'string' ? descriptionOrOptions : descriptionOrOptions?.description;
    const options = typeof descriptionOrOptions === 'object' ? descriptionOrOptions : {};
    
    sonnerToast.error(message, {
      description,
      icon: <XCircle className="w-5 h-5" />,
      className: 'toast-error',
      duration: options.duration,
      style: {
        background: 'white',
        color: '#991b1b',
        border: '1px solid #ef4444',
        boxShadow: '0 10px 15px -3px rgb(239 68 68 / 0.1), 0 4px 6px -4px rgb(239 68 68 / 0.1)',
      },
    });
  },
  
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      icon: <AlertCircle className="w-5 h-5" />,
      className: 'toast-warning',
      style: {
        background: 'white',
        color: '#92400e',
        border: '1px solid #f59e0b',
        boxShadow: '0 10px 15px -3px rgb(245 158 11 / 0.1), 0 4px 6px -4px rgb(245 158 11 / 0.1)',
      },
    });
  },
  
  info: (message: string, descriptionOrOptions?: string | any) => {
    const description = typeof descriptionOrOptions === 'string' ? descriptionOrOptions : descriptionOrOptions?.description;
    const options = typeof descriptionOrOptions === 'object' ? descriptionOrOptions : {};
    
    sonnerToast.info(message, {
      description,
      icon: <Info className="w-5 h-5" />,
      className: 'toast-info',
      duration: options.duration,
      style: {
        background: 'white',
        color: '#1e3a8a',
        border: '1px solid #3b82f6',
        boxShadow: '0 10px 15px -3px rgb(59 130 246 / 0.1), 0 4px 6px -4px rgb(59 130 246 / 0.1)',
      },
    });
  },
  
  loading: (message: string, description?: string) => {
    return sonnerToast.loading(message, {
      description,
      icon: <Loader2 className="w-5 h-5 animate-spin" />,
      className: 'toast-loading',
      style: {
        background: 'white',
        color: '#374151',
        border: '1px solid #9ca3af',
        boxShadow: '0 10px 15px -3px rgb(156 163 175 / 0.1), 0 4px 6px -4px rgb(156 163 175 / 0.1)',
      },
    });
  },
  
  promise: <T,>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: {
        title: msgs.loading,
        icon: <Loader2 className="w-5 h-5 animate-spin" />,
      },
      success: (data) => ({
        title: typeof msgs.success === 'function' ? msgs.success(data) : msgs.success,
        icon: <CheckCircle className="w-5 h-5" />,
      }),
      error: (error) => ({
        title: typeof msgs.error === 'function' ? msgs.error(error) : msgs.error,
        icon: <XCircle className="w-5 h-5" />,
      }),
    });
  },
  
  custom: (component: React.ReactNode) => {
    sonnerToast.custom(component);
  },
  
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },
};

// Custom Toaster component with our styling
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      theme="system"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
        },
        classNames: {
          toast: 'dark:bg-neutral-900 dark:text-gray-100 dark:border-neutral-800',
          title: 'dark:text-gray-100',
          description: 'dark:text-gray-400',
          actionButton: 'dark:bg-neutral-800 dark:text-gray-100',
          cancelButton: 'dark:bg-neutral-800 dark:text-gray-100',
        },
      }}
      className="toaster-wrapper"
    />
  );
}