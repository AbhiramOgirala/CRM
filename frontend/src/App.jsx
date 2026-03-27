import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import useAccessibilityStore from './store/accessibilityStore';
import { LanguageProvider } from './context/LanguageContext';
import './styles/main.css';

// Layout
import MainLayout from './components/common/MainLayout';
import InstallBanner from './components/common/InstallBanner';
import LanguageSelectionModal from './components/common/LanguageSelectionModal';

// Lazy load pages
const Landing = lazy(() => import('./pages/public/Landing'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

// Citizen
const CitizenDashboard = lazy(() => import('./pages/citizen/Dashboard'));
const FileComplaint = lazy(() => import('./pages/citizen/FileComplaint'));
const MyComplaints = lazy(() => import('./pages/citizen/MyComplaints'));
const ComplaintDetail = lazy(() => import('./pages/citizen/ComplaintDetail'));
const CitizenProfile = lazy(() => import('./pages/citizen/Profile'));
const PublicFeed = lazy(() => import('./pages/public/PublicFeed'));

// Officer
const OfficerDashboard = lazy(() => import('./pages/officer/Dashboard'));
const OfficerComplaints = lazy(() => import('./pages/officer/Complaints'));
const GovtPortal = lazy(() => import('./pages/officer/GovtPortal'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));

// Common
const Leaderboard = lazy(() => import('./pages/public/Leaderboard'));
const HotspotMap = lazy(() => import('./pages/public/HotspotMap'));
const NotFound = lazy(() => import('./pages/public/NotFound'));
const About = lazy(() => import('./pages/public/About'));
const PrivacyPolicy = lazy(() => import('./pages/public/PrivacyPolicy'));
const TermsOfUse = lazy(() => import('./pages/public/TermsOfUse'));


// Loading fallback
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
    <div className="loading-spinner" style={{ width: 40, height: 40 }} />
    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading...</p>
  </div>
);

// Root route: desktop shows landing, mobile uses smart redirect
const RootRedirect = () => {
  const { user, token } = useAuthStore();
  const isMobileView = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

  if (!isMobileView) {
    return <Landing />;
  }

  if (token && user) {
    const map = {
      citizen: '/dashboard',
      officer: '/officer/dashboard',
      admin: '/admin/dashboard',
      super_admin: '/admin/dashboard',
    };
    return <Navigate to={map[user.role] || '/dashboard'} replace />;
  }
  return <Navigate to="/register" replace />;
};

// Protected Route
const ProtectedRoute = ({ children, roles }) => {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
};

// Public only route (redirect if logged in)
const PublicOnlyRoute = ({ children }) => {
  const { user, token } = useAuthStore();
  if (token && user) {
    const redirectMap = {
      citizen: '/dashboard',
      officer: '/officer/dashboard',
      admin: '/admin/dashboard',
      super_admin: '/admin/dashboard'
    };
    return <Navigate to={redirectMap[user.role] || '/dashboard'} replace />;
  }
  return children;
};

function App() {
  const { initAccessibility } = useAccessibilityStore();

  React.useEffect(() => {
    initAccessibility();
  }, [initAccessibility]);

  return (
    <LanguageProvider>
    <LanguageSelectionModal />
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: '0.9rem',
            boxShadow: 'var(--shadow-md)'
          },
          success: { iconTheme: { primary: 'var(--success)', secondary: 'white' } },
          error: { iconTheme: { primary: 'var(--danger)', secondary: 'white' } }
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Root: desktop → landing, mobile → smart redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/feed" element={<MainLayout><PublicFeed /></MainLayout>} />
          <Route path="/map" element={<MainLayout><HotspotMap /></MainLayout>} />
          <Route path="/leaderboard" element={<MainLayout><Leaderboard /></MainLayout>} />
          <Route path="/complaint/:id" element={<MainLayout><ComplaintDetail /></MainLayout>} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />

          {/* Auth routes */}
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

          {/* Citizen routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute roles={['citizen']}>
              <MainLayout><CitizenDashboard /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/file-complaint" element={
            <ProtectedRoute roles={['citizen']}>
              <MainLayout><FileComplaint /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/my-complaints" element={
            <ProtectedRoute roles={['citizen']}>
              <MainLayout><MyComplaints /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute roles={['citizen', 'officer', 'admin', 'super_admin']}>
              <MainLayout><CitizenProfile /></MainLayout>
            </ProtectedRoute>
          } />

          {/* Officer routes */}
          <Route path="/officer/dashboard" element={
            <ProtectedRoute roles={['officer']}>
              <MainLayout><OfficerDashboard /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/officer/portal" element={
            <ProtectedRoute roles={['officer', 'admin', 'super_admin']}>
              <MainLayout><GovtPortal /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/officer/complaints" element={
            <ProtectedRoute roles={['officer']}>
              <MainLayout><OfficerComplaints /></MainLayout>
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute roles={['admin', 'super_admin']}>
              <MainLayout><AdminDashboard /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute roles={['admin', 'super_admin']}>
              <MainLayout><AdminUsers /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/complaints" element={
            <ProtectedRoute roles={['admin', 'super_admin']}>
              <MainLayout><OfficerComplaints /></MainLayout>
            </ProtectedRoute>
          } />

          {/* Catch all */}
          <Route path="/unauthorized" element={
            <div className="empty-state" style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="empty-state-icon">🚫</div>
              <h2 className="empty-state-title">Access Denied</h2>
              <p className="empty-state-desc">You don't have permission to view this page.</p>
            </div>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
    <InstallBanner />
    </LanguageProvider>
  );
}

export default App;
