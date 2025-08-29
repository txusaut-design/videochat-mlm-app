'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const AdminFloatingButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      {/* Botón flotante de administración */}
      <div className="fixed bottom-4 left-4 z-50">
        <Link href="/admin">
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center space-x-2"
            size="sm"
          >
            <span>🛡️</span>
            <span>Admin Panel</span>
          </Button>
        </Link>
      </div>
    </>
  );
};
