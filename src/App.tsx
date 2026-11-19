/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AdminAuthPage } from './components/AdminAuthPage';
import { AdminConsole } from './components/AdminConsole';
import { LandingPage } from './components/LandingPage';
import { StudentAuthPage } from './components/StudentAuthPage';
import { StudentPortal } from './components/StudentPortal';
import { CanteenProvider, useCanteen } from './context/CanteenContext';
import { AuthScreen } from './types/canteen';

function AppShell() {
  const { authUser, authLoading } = useCanteen();
  const [screen, setScreen] = useState<AuthScreen>('landing');

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8F7] text-sm font-semibold text-[#09533A]">
        Loading Queue-Free Canteen...
      </div>
    );
  }

  if (authUser?.role === 'student') {
    return <StudentPortal />;
  }

  if (authUser?.role === 'admin') {
    return <AdminConsole />;
  }

  if (screen === 'student-login') {
    return (
      <StudentAuthPage
        onBackToLanding={() => setScreen('landing')}
        onGoToAdminLogin={() => setScreen('admin-login')}
      />
    );
  }

  if (screen === 'admin-login') {
    return (
      <AdminAuthPage
        onBackToLanding={() => setScreen('landing')}
        onGoToStudentLogin={() => setScreen('student-login')}
      />
    );
  }

  return <LandingPage onNavigate={setScreen} />;
}

export default function App() {
  return (
    <CanteenProvider>
      <AppShell />
    </CanteenProvider>
  );
}
