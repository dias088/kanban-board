import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/RouteGuards';
import { StateMessage } from '@/components/StateMessage';
import { BoardPage } from '@/features/board/BoardPage';
import { BoardsPage } from '@/features/boards/BoardsPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';

export function Router() {
  return (
    // Opting into the v7 behaviours now keeps the console clean and makes the
    // eventual upgrade a version bump rather than a migration
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/boards" element={<BoardsPage />} />
            <Route path="/boards/:boardId" element={<BoardPage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/boards" replace />} />
        <Route
          path="*"
          element={
            <div className="mx-auto max-w-md p-10">
              <StateMessage title="Page not found" />
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
