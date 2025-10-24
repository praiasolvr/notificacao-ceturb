import React from 'react';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaSignOutAlt } from 'react-icons/fa';
import { TbReport } from 'react-icons/tb';
import { BiSolidReport } from 'react-icons/bi';
import { colorAzul, colorBranco } from '../../values/colors';

/**
 * Dashboard principal exibido após o login.
 * Mostra as opções de menu de acordo com o setor do usuário.
 */
const Dashboard: React.FC = () => {
  const { user, logout, loading } = useUser();
  const navigate = useNavigate();

  // Enquanto o contexto ainda estiver carregando o usuário
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontSize: '18px' }}>
        Carregando dados do usuário...
      </div>
    );
  }

  // Caso o usuário ainda não tenha sido carregado corretamente
  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontSize: '18px' }}>
        Nenhum usuário autenticado.
      </div>
    );
  }

  // Definição das opções de menu
  const menuOptions = [
    ...(user?.setor === 'Cct'
      ? [
        {
          label: 'Importar Notificações',
          icon: <TbReport size={22} />,
          onClick: () => navigate('/importar-notificacoes', { replace: true }),
        },
      ]
      : []),
    {
      label: 'Relatório Notificações',
      icon: <BiSolidReport size={22} />,
      onClick: () => navigate('/relatorio-notificacoes', { replace: true }),
    },
    {
      label: 'Informações Notificações',
      icon: <TbReport size={22} />,
      onClick: () => navigate('/informacoes-notificacoes', { replace: true }),
    },
    {
      label: 'Relatório Jurídico',
      icon: <TbReport size={22} />,
      onClick: () => navigate('/relatorio-juridico', { replace: true }),
    },
    {
      label: 'Relatório Financeiro',
      icon: <TbReport size={22} />,
      onClick: () => navigate('/relatorio-financeiro', { replace: true }),
    },
  ];

  return (
    <div
      className="container mt-5"
      style={{
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '700px',
      }}
    >
      {/* Saudação personalizada */}
      <h1
        style={{
          color: colorAzul,
          fontSize: '26px',
          fontWeight: 'bold',
          marginBottom: '30px',
          textAlign: 'center',
        }}
      >
        👋 Bem-vindo, {user?.displayName || user?.email || 'Usuário'}!
      </h1>

      {/* Lista de botões do menu */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {menuOptions.map((option, index) => (
          <motion.button
            key={index}
            onClick={option.onClick}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: colorAzul,
              color: colorBranco,
              fontSize: '18px',
              padding: '12px 20px',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            {option.icon}
            {option.label}
          </motion.button>
        ))}

        {/* Botão de sair */}
        <motion.button
          onClick={logout}
          whileTap={{ scale: 0.95 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#e74c3c',
            color: colorBranco,
            fontSize: '18px',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginTop: '20px',
          }}
        >
          <FaSignOutAlt size={22} />
          Sair
        </motion.button>
      </div>
    </div>
  );
};

export default Dashboard;