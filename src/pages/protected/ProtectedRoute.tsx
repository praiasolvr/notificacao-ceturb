// src/pages/protected/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext'; // Importa o hook que gerencia o estado de usuário


const emailsPermitidos = ['cct@viacaopraiasol.com.br', 'juridico@viacaopraiasol.com.br'];

// Componente de rota protegida
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser(); // Obtém o usuário do contexto

  // Verifica se o usuário está logado
  if (!user) {
    // Se não estiver logado, redireciona para a página inicial (home)
    return <Navigate to="/" />;
  }

  // Verifica se o e-mail do usuário é o correto (admin)
  if (!emailsPermitidos.includes(user.email ?? '')) {
    return <Navigate to="/dashboard-cliente-publico" />;
  }

  // Se o usuário estiver logado e tiver o e-mail correto, renderiza os filhos (página privada)
  return <>{children}</>;
};

export default ProtectedRoute;