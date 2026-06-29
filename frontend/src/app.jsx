import { useState, useEffect } from 'preact/hooks';
import { Dashboard } from './components/Dashboard';
import { LandingPage } from './components/LandingPage';

export function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (path === '/admin/dashboard') {
    return <Dashboard />;
  }

  return <LandingPage />;
}
