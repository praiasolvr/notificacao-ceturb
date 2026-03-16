import { Routes, Route } from 'react-router-dom';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import PrivateLayout from './layouts/PrivateLayout';

// Componentes
import Header from './components/Header';
import ProtectedRoute from './pages/protected/ProtectedRoute';

// Páginas públicas
import Home from './pages/public/Home';
import Login from './pages/public/Login';

// Páginas públicas autenticadas
import DashboardClientePublico from './pages/public/DashboardClientePublico';
import MinhasSolicitacoes from './pages/public/MinhasSolicitacoes';
import NovaSolicitacao from './pages/public/NovaSolicitacao';

// Páginas privadas
import Dashboard from './pages/client/Dashboard';
import ImportarNotificacoes from './pages/admin/ImportarNotificacoes';
import RelatorioSolicitacoes from './pages/admin/RelatorioSolicitacoes';
import RelatorioNotificacoes from './pages/admin/RelatorioNotificacoes';
import InformacoesNotificacoes from './pages/admin/InformacoesNotificacoes';
import RelatorioJuridico from './pages/admin/RelatorioJuridico';
import RelatorioFinanceiro from './pages/admin/RelatorioFinanceiro';
import ConfigValorKm from './pages/admin/ConfigValorKm';

function App() {
  return (
    <Routes>

      {/* Rotas públicas */}
      <Route path="/" element={<><Header /><Home /></>} />
      <Route path="/login" element={<><Header /><Login /></>} />

      {/* Rotas públicas autenticadas */}
      <Route element={<PublicLayout />}>
        <Route path="/dashboard-cliente-publico" element={<DashboardClientePublico />} />
        <Route path="/nova-solicitacao" element={<NovaSolicitacao />} />
        <Route path="/minhas-solicitacoes" element={<MinhasSolicitacoes />} />
      </Route>

      {/* Rotas privadas */}
      <Route element={
        <ProtectedRoute>
          <PrivateLayout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/importar-notificacoes" element={<ImportarNotificacoes />} />
        <Route path="/relatorio-solicitacoes" element={<RelatorioSolicitacoes />} />
        <Route path="/relatorio-notificacoes" element={<RelatorioNotificacoes />} />
        <Route path="/informacoes-notificacoes" element={<InformacoesNotificacoes />} />
        <Route path="/relatorio-juridico" element={<RelatorioJuridico />} />
        <Route path="/relatorio-financeiro" element={<RelatorioFinanceiro />} />
        <Route path="/config-valor-km" element={<ConfigValorKm />} />
      </Route>

    </Routes>
  );
}

export default App;
