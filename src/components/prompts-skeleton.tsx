import { Skeleton } from '@/components/ui/skeleton';

export function PromptsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            <th className="px-6 py-3 text-left">
              <Skeleton className="h-4 w-20" />
            </th>
            <th className="px-6 py-3 text-left">
              <Skeleton className="h-4 w-16" />
            </th>
            <th className="px-6 py-3 text-center">
              <Skeleton className="h-4 w-16 mx-auto" />
            </th>
            <th className="px-6 py-3 text-center">
              <Skeleton className="h-4 w-12 mx-auto" />
            </th>
            <th className="px-6 py-3 text-left">
              <Skeleton className="h-4 w-20" />
            </th>
            <th className="relative px-6 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {[...Array(5)].map((_, i) => (
            <tr key={i}>
              <td className="px-6 py-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </td>
              <td className="px-6 py-4">
                <Skeleton className="h-6 w-20 rounded-full" />
              </td>
              <td className="px-6 py-4 text-center">
                <Skeleton className="h-4 w-8 mx-auto" />
              </td>
              <td className="px-6 py-4 text-center">
                <Skeleton className="h-4 w-6 mx-auto" />
              </td>
              <td className="px-6 py-4">
                <Skeleton className="h-4 w-24" />
              </td>
              <td className="px-6 py-4">
                <Skeleton className="h-8 w-16 ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PromptDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      
      <div className="flex gap-4">
        <Skeleton className="h-20 w-32 rounded-lg" />
        <Skeleton className="h-20 w-32 rounded-lg" />
        <Skeleton className="h-20 w-32 rounded-lg" />
      </div>
    </div>
  );
}