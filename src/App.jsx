import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';
import Layout from './components/layout/Layout';
import Spinner from './components/ui/Spinner';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import SetupOrg from './pages/SetupOrg';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import CreateTask from './pages/CreateTask';
import EditTask from './pages/EditTask';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import CreateProject from './pages/CreateProject';
import EditProject from './pages/EditProject';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import CreateClient from './pages/CreateClient';
import EditClient from './pages/EditClient';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/MeetingDetail';
import CreateMeeting from './pages/CreateMeeting';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import CreateInvoice from './pages/CreateInvoice';
import EditInvoice from './pages/EditInvoice';
import Organizations from './pages/Organizations';
import OrganizationDetail from './pages/OrganizationDetail';
import CreateOrganization from './pages/CreateOrganization';
import Settings from './pages/Settings';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Conversations from './pages/Conversations';
import SuperAdminPanel from './pages/SuperAdminPanel';
import ForgotPassword from './pages/ForgotPassword';
import Enquiries from './pages/Enquiries';
import PremiumFeatures from './pages/PremiumFeatures';
import MyPlan from './pages/MyPlan';
import NotFound from './pages/NotFound';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { token, isInitialized } = useAuthStore();
  const location = useLocation();
  if (!isInitialized) return <LoadingScreen />;
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function OrgRoute({ children }) {
  const { token, user, isInitialized } = useAuthStore();
  const location = useLocation();
  if (!isInitialized) return <LoadingScreen />;
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  // product_owner doesn't need an org — they own the platform
  // superadmin (paid client) MUST create an org before proceeding
  if (user?.role !== 'product_owner' && !user?.organizationId) return <Navigate to="/setup-org" replace />;
  return children;
}

function ProductOwnerRoute({ children }) {
  const { token, user, isInitialized } = useAuthStore();
  const location = useLocation();
  if (!isInitialized) return <LoadingScreen />;
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user?.role !== 'product_owner') return <Navigate to="/" replace />;
  return children;
}

function AuthRoute({ children }) {
  const { token, isInitialized } = useAuthStore();
  if (!isInitialized) return <LoadingScreen />;
  if (token) return <Navigate to="/" replace />;
  return children;
}

// Redirects free-plan superadmins to /premium when they try to access pro-only routes.
// product_owner, org_admin, employee and paid plans pass through freely.
function PlanRoute({ children }) {
  const { user, subscriptionPlan } = useAuthStore();
  if (user?.role === 'superadmin') {
    const isPro = subscriptionPlan === 'pro' || subscriptionPlan === 'enterprise';
    if (!isPro) return <Navigate to="/plan" replace />;
  }
  return children;
}

function AppRoutes() {
  const { user } = useAuthStore();
  return (
    <Routes>
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
      <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
      <Route path="/setup-org" element={<ProtectedRoute><SetupOrg /></ProtectedRoute>} />

      <Route
        path="/*"
        element={
          <OrgRoute>
            <Layout>
              {({ onMenuClick }) => (
                <Routes>
                  <Route path="/" element={<Dashboard onMenuClick={onMenuClick} />} />

                  <Route path="/tasks" element={<Tasks onMenuClick={onMenuClick} />} />
                  <Route path="/tasks/new" element={<CreateTask onMenuClick={onMenuClick} />} />
                  <Route path="/tasks/:id" element={<TaskDetail onMenuClick={onMenuClick} />} />
                  <Route path="/tasks/:id/edit" element={<EditTask onMenuClick={onMenuClick} />} />

                  <Route path="/projects" element={<Projects onMenuClick={onMenuClick} />} />
                  <Route path="/projects/new" element={<CreateProject onMenuClick={onMenuClick} />} />
                  <Route path="/projects/:id" element={<ProjectDetail onMenuClick={onMenuClick} />} />
                  <Route path="/projects/:id/edit" element={<EditProject onMenuClick={onMenuClick} />} />

                  <Route path="/clients" element={<Clients onMenuClick={onMenuClick} />} />
                  <Route path="/clients/new" element={<CreateClient onMenuClick={onMenuClick} />} />
                  <Route path="/clients/:id" element={<ClientDetail onMenuClick={onMenuClick} />} />
                  <Route path="/clients/:id/edit" element={<EditClient onMenuClick={onMenuClick} />} />

                  {/* Pro-only routes — free superadmins redirected to /premium */}
                  <Route path="/meetings" element={<PlanRoute><Meetings onMenuClick={onMenuClick} /></PlanRoute>} />
                  <Route path="/meetings/new" element={<PlanRoute><CreateMeeting onMenuClick={onMenuClick} /></PlanRoute>} />
                  <Route path="/meetings/:id" element={<PlanRoute><MeetingDetail onMenuClick={onMenuClick} /></PlanRoute>} />

                  <Route path="/invoices" element={
                    user?.role === 'product_owner' ? <Navigate to="/" replace /> : <Invoices onMenuClick={onMenuClick} />
                  } />
                  <Route path="/invoices/new" element={
                    user?.role === 'product_owner' ? <Navigate to="/" replace /> : <CreateInvoice onMenuClick={onMenuClick} />
                  } />
                  <Route path="/invoices/:id" element={
                    user?.role === 'product_owner' ? <Navigate to="/" replace /> : <InvoiceDetail onMenuClick={onMenuClick} />
                  } />
                  <Route path="/invoices/:id/edit" element={
                    user?.role === 'product_owner' ? <Navigate to="/" replace /> : <EditInvoice onMenuClick={onMenuClick} />
                  } />

                  <Route path="/organizations" element={<PlanRoute><Organizations onMenuClick={onMenuClick} /></PlanRoute>} />
                  <Route path="/organizations/new" element={<PlanRoute><CreateOrganization onMenuClick={onMenuClick} /></PlanRoute>} />
                  <Route path="/organizations/:id" element={<PlanRoute><OrganizationDetail onMenuClick={onMenuClick} /></PlanRoute>} />

                  <Route path="/settings" element={<Settings onMenuClick={onMenuClick} />} />
                  <Route path="/users" element={<Users onMenuClick={onMenuClick} />} />
                  <Route path="/users/:id" element={<UserDetail onMenuClick={onMenuClick} />} />

                  <Route path="/conversations" element={<PlanRoute><Conversations onMenuClick={onMenuClick} /></PlanRoute>} />

                  <Route path="/premium" element={<PremiumFeatures onMenuClick={onMenuClick} />} />
                  {/* /plan is always accessible — it's how free users upgrade */}
                  <Route path="/plan" element={<MyPlan onMenuClick={onMenuClick} />} />

                  <Route path="/enquiries" element={
                    <ProductOwnerRoute>
                      <Enquiries onMenuClick={onMenuClick} />
                    </ProductOwnerRoute>
                  } />

                  <Route path="/superadmin" element={
                    <ProductOwnerRoute>
                      <SuperAdminPanel onMenuClick={onMenuClick} />
                    </ProductOwnerRoute>
                  } />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              )}
            </Layout>
          </OrgRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  const { initialize } = useAuthStore();
  useThemeStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { borderRadius: '12px', fontSize: '14px' },
        }}
      />
    </BrowserRouter>
  );
}
