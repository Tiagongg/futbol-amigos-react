import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GuestRoute, SessionRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { TeamProvider } from './context/TeamContext';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { MatchesPage } from './pages/MatchesPage';
import { PlayerFormPage } from './pages/PlayerFormPage';
import { PlayersPage } from './pages/PlayersPage';
import { RegisterPage } from './pages/RegisterPage';
import { ScorerHistoryPage } from './pages/ScorerHistoryPage';
import { TeamsPage } from './pages/TeamsPage';
import { TopScorersPage } from './pages/TopScorersPage';
import { TournamentsPage } from './pages/TournamentsPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

function TeamAppRoutes() {
  return (
    <TeamProvider>
      <Routes>
        <Route path="/" element={<PlayersPage />} />
        <Route path="/players/new" element={<PlayerFormPage />} />
        <Route path="/players/:playerId/edit" element={<PlayerFormPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/matches/:matchId" element={<MatchDetailPage />} />
        <Route path="/scorers" element={<TopScorersPage />} />
        <Route path="/scorers/:format/:playerId" element={<ScorerHistoryPage />} />
      </Routes>
    </TeamProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          <Route element={<SessionRoute allowed={['email_verification_pending']} />}>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Route>

          <Route element={<SessionRoute allowed={['pick_tournament', 'ready']} />}>
            <Route path="/tournaments" element={<TournamentsPage />} />
          </Route>

          <Route element={<SessionRoute allowed={['ready']} />}>
            <Route path="/*" element={<TeamAppRoutes />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
