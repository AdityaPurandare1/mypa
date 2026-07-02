import { useAuth } from './lib/auth';
import { Splash } from './components/Splash';
import { SignIn } from './components/SignIn';
import { Home } from './components/Home';

// Auth gate: while restoring the session show a splash; if signed out show the
// sign-in screen; otherwise the app.
export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <Splash />;
  if (!session) return <SignIn />;
  return <Home />;
}
