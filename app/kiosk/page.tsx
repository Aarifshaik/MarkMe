'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import KioskInterface from '@/components/KioskInterface';
import Navigation from '@/components/Navigation';

function KioskContent() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation Header */}
        <Navigation currentPage="kiosk" />

        {/* Kiosk Interface Content */}
        <KioskInterface />
      </div>
    </main>
  );
}

export default function KioskPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'kiosk']}>
      <KioskContent />
    </ProtectedRoute>
  );
}