// React 19 type extensions for Next.js 15
// These extend the React 18 types to support React 19 features

import 'react';

declare module 'react' {
  // React 19 async component support
  export type FC<P = object> = FunctionComponent<P> | ((props: P) => Promise<React.ReactElement | null>);
  
  // Support for use() hook
  export function use<T>(promise: Promise<T>): T;
}

// Next.js 15 route handler types with React 19
declare module 'next' {
  export interface PageProps<
    TParams extends Record<string, string> = Record<string, string>,
    TSearchParams extends Record<string, string | string[] | undefined> = Record<string, string | string[] | undefined>
  > {
    params: Promise<TParams>;
    searchParams: Promise<TSearchParams>;
  }
  
  export interface LayoutProps<
    TParams extends Record<string, string> = Record<string, string>
  > {
    children: React.ReactNode;
    params: Promise<TParams>;
  }
  
  export interface RouteHandlerContext<
    TParams extends Record<string, string> = Record<string, string>
  > {
    params: Promise<TParams>;
  }
}

// Fix for async server components
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Allow async components
      [elemName: string]: any;
    }
  }
}