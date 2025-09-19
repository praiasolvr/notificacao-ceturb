// App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import PrivateLayout from './layouts/PrivateLayout';

// Componentes
import Header from './components/Header';
import ProtectedRoute from './pages/protected/ProtectedRoute';

// Páginas públicas (sem login)
import Home from './pages/public/Home';
import Login from './pages/public/Login';

// Páginas públicas com login (clientes)
import DashboardClientePublico from './pages/public/DashboardClientePublico';
import MinhasSolicitacoes from './pages/public/MinhasSolicitacoes';
import NovaSolicitacao from './pages/public/NovaSolicitacao';

// Páginas privadas (admin/sistema interno)
import Dashboard from './pages/client/Dashboard';
import ImportarNotificacoes from './pages/admin/ImportarNotificacoes';
import RelatorioSolicitacoes from './pages/admin/RelatorioSolicitacoes';
import RelatorioNotificacoes from './pages/admin/RelatorioNotificacoes';
import InformacoesNotificacoes from './pages/admin/InformacoesNotificacoes';
import RelatorioJuridico from './pages/admin/RelatorioJuridico';


function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>

          {/* Rotas públicas sem autenticação, com Header */}
          <Route path="/" element={<><Header /><Home /></>} />
          <Route path="/login" element={<><Header /><Login /></>} />

          {/* Rotas públicas autenticadas (clientes) com layout próprio e sem Header */}
          <Route element={<PublicLayout />}>
            <Route path="/dashboard-cliente-publico" element={<DashboardClientePublico />} />

            {/* Solicitacoes */}
            <Route path="/nova-solicitacao" element={<NovaSolicitacao />} />
            <Route path="/minhas-solicitacoes" element={<MinhasSolicitacoes />} />

          </Route>

          {/* Rotas privadas protegidas por autenticação (admin ou usuários internos) */}
          <Route element={
            <ProtectedRoute>
              <PrivateLayout />
            </ProtectedRoute>
          }>
            {/* Dashboard inicial */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/importar-notificacoes" element={<ImportarNotificacoes />} />
            <Route path="/relatorio-solicitacoes" element={<RelatorioSolicitacoes />} />
            <Route path="/relatorio-notificacoes" element={<RelatorioNotificacoes />} />
            <Route path="/informacoes-notificacoes" element={<InformacoesNotificacoes />} />
            <Route path="/relatorio-juridico" element={<RelatorioJuridico />} />
          </Route>

        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;