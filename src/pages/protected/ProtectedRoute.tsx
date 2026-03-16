import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';

const emailsPermitidos = [
  'cct@viacaopraiasol.com.br',
  'juridico@viacaopraiasol.com.br',
  'fiscalizacao@viacaopraiasol.com.br',
  'manutencao@viacaopraiasol.com.br',
  'trafego@viacaopraiasol.com.br',
];

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useUser();

  // 🔥 Enquanto o Firebase restaura a sessão, NÃO redirecionar
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Validando sessão...
      </div>
    );
  }

  // 🔥 Se terminou de carregar e não tem usuário → volta para login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 🔥 Se o usuário existe mas não tem permissão → dashboard público
  if (!emailsPermitidos.includes(user.email ?? '')) {
    return <Navigate to="/dashboard-cliente-publico" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
