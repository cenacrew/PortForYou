import React, { Suspense, lazy } from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute, { isLoggedIn } from './components/ProtectedRoute';
import { CircularProgress, Box } from '@mui/material';
import { trackPageView } from './utils';
import Seo from './components/Seo';

const Accueil = lazy(() => import('./pages/Accueil'));
const Biographie = lazy(() => import('./pages/Biographie'));
const Galerie = lazy(() => import('./pages/Galerie'));
const ArtworkInfo = lazy(() => import('./pages/ArtworkInfo'));
const Presse = lazy(() => import('./pages/Presse'));
const Contact = lazy(() => import('./pages/Contact'));
const AdminLogin = lazy(() => import('./pages/back_office/AdminLogin'));
const BackOffice = lazy(() => import('./pages/back_office/BackOffice'));

const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
    <CircularProgress />
  </Box>
);

function PageTracker() {
  const location = useLocation();
  React.useEffect(() => {
    const match = location.pathname.match(/^\/galerie\/(.+)$/);
    trackPageView(location.pathname, match ? match[1] : undefined);
  }, [location.pathname]);
  return null;
}

function AdminRedirect() {
  return isLoggedIn() ? (
    <Navigate to="/admin/back-office" replace />
  ) : (
    <Navigate to="/admin/login" replace />
  );
}

function AdminLoginPage() {
  return isLoggedIn() ? <Navigate to="/admin/back-office" replace /> : <AdminLogin />;
}

function App() {
  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <PageTracker />
      <Seo />
      <Header />
      <main style={{ flex: 1 }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/biographie" element={<Biographie />} />
            <Route path="/galerie" element={<Galerie />} />
            <Route path="/galerie/:id" element={<ArtworkInfo />} />
            <Route path="/presse" element={<Presse />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/admin" element={<AdminRedirect />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/admin/back-office" element={<BackOffice />} />
            </Route>
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default App;
