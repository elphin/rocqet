import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  // Singleton pattern to avoid multiple client instances
  if (client) return client;
  
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Safely parse cookies
          try {
            const cookies = document.cookie.split('; ');
            const cookie = cookies.find(c => c.startsWith(`${name}=`));
            if (!cookie) return undefined;
            
            const value = cookie.split('=')[1];
            // Check if it's a base64 string that needs decoding
            if (value && value.startsWith('base64-')) {
              try {
                const decoded = atob(value.substring(7));
                return decoded;
              } catch {
                // If base64 decoding fails, return as is
                return value;
              }
            }
            return value;
          } catch {
            return undefined;
          }
        },
        set(name: string, value: string, options?: any) {
          try {
            document.cookie = `${name}=${value}; path=/; ${options?.maxAge ? `max-age=${options.maxAge};` : ''}`;
          } catch {
            // Ignore cookie set errors in client
          }
        },
        remove(name: string) {
          try {
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
          } catch {
            // Ignore cookie remove errors
          }
        },
      },
    }
  );
  
  return client;
}