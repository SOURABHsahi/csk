import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import AuthGuard from './components/layout/AuthGuard'
import { ModalProvider } from './components/contexts/ModalContext'
import { UserProvider } from './components/contexts/UserContext'
import { AudioProvider } from './components/contexts/AudioContext'
import { ToastProvider } from './components/contexts/ToastContext'
import GlobalAudioPlayer from './components/widgets/GlobalAudioPlayer'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Communities from './pages/Communities';
import CommunityView from './pages/CommunityView';
import Jobs from './pages/Jobs';
import Videos from './pages/Videos';
import Podcasts from './pages/Podcasts';
import Articles from './pages/Articles';
import ArticleView from './pages/ArticleView';
import HRAnalytics from './pages/HRAnalytics';
import AdminConsole from './pages/AdminConsole';
import Search from './pages/Search';
import Profile from './pages/Profile';
import KarmaHistory from './pages/KarmaHistory';
import Network from './pages/Network';
import SavedContent from './pages/SavedContent';
import Posts from './pages/Posts';

/**
 * Wraps a page in Layout + AuthGuard for protected routes.
 */
function ProtectedPage({ children }) {
  return (
    <AuthGuard>
      <Layout>{children}</Layout>
    </AuthGuard>
  );
}

function App() {
  return (
    <UserProvider>
      <AudioProvider>
        <ToastProvider>
          <ModalProvider>
            <Router>
              <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route path="/"                element={<ProtectedPage><Dashboard /></ProtectedPage>} />
                <Route path="/community"       element={<ProtectedPage><Communities /></ProtectedPage>} />
                <Route path="/community/view"  element={<ProtectedPage><CommunityView /></ProtectedPage>} />
                <Route path="/jobs"            element={<ProtectedPage><Jobs /></ProtectedPage>} />
                <Route path="/videos"          element={<ProtectedPage><Videos /></ProtectedPage>} />
                <Route path="/podcasts"        element={<ProtectedPage><Podcasts /></ProtectedPage>} />
                <Route path="/articles"        element={<ProtectedPage><Articles /></ProtectedPage>} />
                <Route path="/article-view"    element={<ProtectedPage><ArticleView /></ProtectedPage>} />
                <Route path="/hr-analytics"    element={<ProtectedPage><HRAnalytics /></ProtectedPage>} />
                <Route path="/admin-console"   element={<ProtectedPage><AdminConsole /></ProtectedPage>} />
                <Route path="/profile"         element={<ProtectedPage><Profile /></ProtectedPage>} />
                <Route path="/search"          element={<ProtectedPage><Search /></ProtectedPage>} />
                <Route path="/karma-history"   element={<ProtectedPage><KarmaHistory /></ProtectedPage>} />
                <Route path="/suggested-people" element={<ProtectedPage><Network /></ProtectedPage>} />
                <Route path="/saved-content"   element={<ProtectedPage><SavedContent /></ProtectedPage>} />
                <Route path="/posts"           element={<ProtectedPage><Posts /></ProtectedPage>} />
                <Route path="*"               element={<Navigate to="/" replace />} />
              </Routes>
              <GlobalAudioPlayer />
            </Router>
          </ModalProvider>
        </ToastProvider>
      </AudioProvider>
    </UserProvider>
  )
}

export default App
