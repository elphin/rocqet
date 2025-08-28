import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-button-primary text-white shadow-xs hover:bg-button-primary-hover hover:shadow-md active:bg-button-primary-hover active:shadow-inner dark:bg-button-primary dark:hover:bg-button-primary-hover',
        primaryCta:
          'bg-button-primary-cta text-white shadow-md hover:bg-button-primary-cta-hover hover:shadow-lg active:shadow-inner dark:bg-blue-600 dark:hover:bg-blue-500',
        success:
          'bg-button-success text-white shadow-xs hover:bg-button-success-hover hover:shadow-md active:shadow-inner dark:bg-emerald-600 dark:hover:bg-emerald-500',
        warning:
          'bg-button-warning text-white shadow-xs hover:bg-button-warning-hover hover:shadow-md active:shadow-inner dark:bg-amber-600 dark:hover:bg-amber-500',
        accent:
          'bg-button-accent text-white shadow-xs hover:bg-button-accent-hover hover:shadow-md active:shadow-inner dark:bg-purple-600 dark:hover:bg-purple-500',
        destructive:
          'bg-error text-white shadow-xs hover:bg-red-600 hover:shadow-md active:shadow-inner dark:bg-red-600 dark:hover:bg-red-700',
        outline:
          'border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 active:bg-neutral-100 dark:active:bg-neutral-700',
        secondary:
          'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:bg-neutral-300 dark:active:bg-neutral-600',
        ghost: 
          'text-primary dark:text-blue-400 hover:bg-primary/10 dark:hover:bg-blue-400/10 active:bg-primary/15 dark:active:bg-blue-400/15',
        link: 
          'text-primary dark:text-blue-400 underline-offset-4 hover:underline',
        successLight:
          'bg-button-success-light text-button-success border border-button-success/20 hover:bg-button-success hover:text-white dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
        warningLight:
          'bg-button-warning-light text-button-warning border border-button-warning/20 hover:bg-button-warning hover:text-white dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
      },
      size: {
        default: 'h-8 px-3 py-1.5 text-sm rounded-md [&_svg]:size-3.5',
        sm: 'h-7 px-2.5 text-xs rounded-md [&_svg]:size-3',
        lg: 'h-10 px-4 text-base rounded-md [&_svg]:size-4',
        icon: 'h-8 w-8 rounded-md [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, asChild, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };