'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Table skeleton for employee lists
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header skeleton */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-100 rounded-lg">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="grid grid-cols-4 gap-4 p-4 border-b"
        >
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </motion.div>
      ))}
    </div>
  );
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center space-y-2">
            <Skeleton className="h-4 w-12 mx-auto" />
            <Skeleton className="h-8 w-8 mx-auto" />
          </div>
          <div className="text-center space-y-2">
            <Skeleton className="h-4 w-12 mx-auto" />
            <Skeleton className="h-8 w-8 mx-auto" />
          </div>
          <div className="text-center space-y-2">
            <Skeleton className="h-4 w-12 mx-auto" />
            <Skeleton className="h-8 w-8 mx-auto" />
          </div>
        </div>
        <Skeleton className="h-2 w-full" />
      </CardContent>
    </Card>
  );
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="text-center mb-8 space-y-2">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>

        {/* Overall stats skeleton */}
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="text-center space-y-2">
                  <Skeleton className="h-8 w-16 mx-auto" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cluster stats skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <StatsCardSkeleton key={index} />
            ))}
          </div>
        </div>

        {/* Table skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-64" />
            </div>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={8} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Kiosk interface skeleton
export function KioskSkeleton() {
  return (
    <div className="max-w-6xl mx-auto mt-8" data-testid="kiosk-skeleton">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <div className="flex items-center space-x-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Skeleton className="h-4 w-full" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TableSkeleton rows={6} />
        </CardContent>
      </Card>
    </div>
  );
}

// Modal skeleton
export function ModalSkeleton() {
  return (
    <div className="space-y-6">
      {/* Employee info skeleton */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Family members skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
            {index > 1 && <Skeleton className="h-9 w-full" />}
          </div>
        ))}
      </div>

      {/* Preview skeleton */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4 space-y-3">
          <Skeleton className="h-4 w-16" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}