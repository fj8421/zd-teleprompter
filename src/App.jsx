import { useState, useEffect, useCallback } from 'react';
import { SettingsProvider } from './store/SettingsContext';
import { HomeView } from './views/HomeView';
import { EditorView } from './views/EditorView';
import { PlayerView } from './views/PlayerView';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/global.css';
import './styles/apple.css';

const parseHash = () => {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash) return { view: 'home', textId: null };

  const [view, textId] = hash.split('/');
  if (view === 'editor' || view === 'player') {
    return { view, textId: textId || null };
  }
  return { view: 'home', textId: null };
};

const buildHash = (view, textId) => {
  if (view === 'home') return '#/';
  if (textId) return `#/${view}/${textId}`;
  return `#/${view}`;
};

function App() {
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((newView, textId = null) => {
    const nextHash = buildHash(newView, textId);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      setRoute({ view: newView, textId });
    }
  }, []);

  const goBack = useCallback(() => navigate('home', null), [navigate]);

  const { view, textId } = route;

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <div style={{ width: '100%', height: '100%' }}>
          {view === 'home' && <HomeView onNavigate={navigate} />}
          {view === 'editor' && (
            <EditorView
              textId={textId}
              onNavigate={navigate}
              onBack={goBack}
            />
          )}
          {view === 'player' && (
            <PlayerView
              textId={textId}
              onBack={goBack}
            />
          )}
        </div>
      </SettingsProvider>
    </ErrorBoundary>
  );
}

export default App;
