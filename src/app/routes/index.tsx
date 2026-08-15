// ============================================================
// App Routes — Lazy-loaded pages with auth guards
// ============================================================
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/auth-provider';
import { Loader2 } from 'lucide-react';

// Lazy load pages
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const QuotationListPage = lazy(() => import('@/features/quotations/pages/QuotationListPage'));
const QuotationBuilderPage = lazy(() => import('@/features/quotations/pages/QuotationBuilderPage'));
const QuotationDetailPage = lazy(() => import('@/features/quotations/pages/QuotationDetailPage'));
const InvoiceListPage = lazy(() => import('@/features/invoices/pages/InvoiceListPage'));
const InvoiceBuilderPage = lazy(() => import('@/features/invoices/pages/InvoiceBuilderPage'));
const InvoiceDetailPage = lazy(() => import('@/features/invoices/pages/InvoiceDetailPage'));
const CustomersPage = lazy(() => import('@/features/customers/pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('@/features/customers/pages/CustomerDetailPage'));
const DepartmentsPage = lazy(() => import('@/features/departments/pages/DepartmentsPage'));
const ProductsPage = lazy(() => import('@/features/products/pages/ProductsPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));
const OfferListPage = lazy(() => import('@/features/offers/pages/OfferListPage'));
const OfferBuilderPage = lazy(() => import('@/features/offers/pages/OfferBuilderPage'));
const OfferDetailPage = lazy(() => import('@/features/offers/pages/OfferDetailPage'));
const MainLayout = lazy(() => import('@/shared/components/layout/MainLayout'));
const FinanceDashboardPage = lazy(() => import('@/features/finance/pages/FinanceDashboardPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const ClientLoginPage = lazy(() => import('@/features/portal/pages/ClientLoginPage'));
const ClientWorkspacePage = lazy(() => import('@/features/portal/pages/ClientWorkspacePage'));

/** Full-screen loading spinner */
function PageLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[var(--color-bg-primary)]">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </div>
  );
}

/** Route guard — redirects to login if unauthenticated */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

/** Route guard — redirects to dashboard if already authenticated */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return <>{children}</>;
}

/** Conditional Home Route — shows landing page for public, dashboard for auth */
function HomeRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (isAuthenticated) {
    return (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    );
  }
  return <LandingPage />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />

        {/* Client Portal dedicated routes */}
        <Route path="/portal" element={<Navigate to="/portal/login" replace />} />
        <Route path="/portal/login" element={<ClientLoginPage />} />
        <Route path="/portal/activate" element={<ClientLoginPage />} />
        <Route path="/portal/workspace" element={<ClientWorkspacePage />} />

        {/* Conditional root route */}
        <Route path="/" element={<HomeRoute />}>
          <Route index element={<DashboardPage />} />
        </Route>

        {/* Protected routes inside MainLayout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="quotations" element={<QuotationListPage />} />
          <Route path="quotations/new" element={<QuotationBuilderPage />} />
          <Route path="quotations/:id" element={<QuotationDetailPage />} />
          <Route path="invoices" element={<InvoiceListPage />} />
          <Route path="invoices/new" element={<InvoiceBuilderPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="offers" element={<OfferListPage />} />
          <Route path="offers/new" element={<OfferBuilderPage />} />
          <Route path="offers/:id" element={<OfferDetailPage />} />
          <Route path="finance" element={<FinanceDashboardPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
