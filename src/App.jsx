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
  // Superadmin doesn't need an org — they own the platform
  if (user?.role !== 'superadmin' && !user?.organizationId) return <Navigate to="/setup-org" replace />;
  return children;
}

function AuthRoute({ children }) {
  const { token, isInitialized } = useAuthStore();
  if (!isInitialized) return <LoadingScreen />;
  if (token) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
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

                  <Route path="/meetings" element={<Meetings onMenuClick={onMenuClick} />} />
                  <Route path="/meetings/new" element={<CreateMeeting onMenuClick={onMenuClick} />} />
                  <Route path="/meetings/:id" element={<MeetingDetail onMenuClick={onMenuClick} />} />

                  <Route path="/invoices" element={<Invoices onMenuClick={onMenuClick} />} />
                  <Route path="/invoices/new" element={<CreateInvoice onMenuClick={onMenuClick} />} />
                  <Route path="/invoices/:id" element={<InvoiceDetail onMenuClick={onMenuClick} />} />
                  <Route path="/invoices/:id/edit" element={<EditInvoice onMenuClick={onMenuClick} />} />

                  <Route path="/organizations" element={<Organizations onMenuClick={onMenuClick} />} />
                  <Route path="/organizations/new" element={<CreateOrganization onMenuClick={onMenuClick} />} />
                  <Route path="/organizations/:id" element={<OrganizationDetail onMenuClick={onMenuClick} />} />

                  <Route path="/settings" element={<Settings onMenuClick={onMenuClick} />} />
                  <Route path="/users" element={<Users onMenuClick={onMenuClick} />} />
                  <Route path="/users/:id" element={<UserDetail onMenuClick={onMenuClick} />} />

                  <Route path="/conversations" element={<Conversations onMenuClick={onMenuClick} />} />

                  <Route path="/superadmin" element={<SuperAdminPanel onMenuClick={onMenuClick} />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
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
