// Utility function to handle Supabase queries with proper types
export function assertDefined<T>(value: T | null | undefined, redirectUrl?: string): asserts value is T {
  if (!value) {
    if (redirectUrl && typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
    throw new Error('Value is not defined');
  }
}