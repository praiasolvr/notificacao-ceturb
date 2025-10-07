import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaSignOutAlt } from 'react-icons/fa';

import IconNotification from '../assets/icon-notificacao.svg';


import { useUser } from '../contexts/UserContext';
import { getAuth, signOut } from 'firebase/auth';
import { TbReport } from "react-icons/tb";
import { BiSolidReport } from "react-icons/bi";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [_viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const location = useLocation();
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    navigate('/login');
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const sidebarStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: isOpen ? 0 : '-250px',
    width: '250px',
    height: '100dvh', // Ajuste para 100dvh
    backgroundColor: '#0b1d40',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'left 0.4s ease-in-out',
    zIndex: 999,
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '1rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
  };

  const navStyle: React.CSSProperties = {
    flexGrow: 1,
    overflowY: 'auto',
    padding: '1rem 0.5rem',
  };

  const linkStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '8px',
    marginBottom: '1rem',
  };

  const activeLinkStyle: React.CSSProperties = {
    backgroundColor: '#0d6efd',
  };

  const iconStyle: React.CSSProperties = {
    marginRight: '10px',
  };

  return (
    <div style={sidebarStyle}>
      <div>
        {window.innerWidth < 768 && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '2rem',
              color: '#fff',
              margin: '1rem',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        )}
        <div style={headerStyle}>
          {/* <div style={{ fontSize: '3rem' }}><TbReportAnalytics /></div> */}
          <img src={IconNotification} alt="Ícone de notificação" style={{ width: '4rem', color: 'red' }} />
          <br />
          <span style={{ color: '#ffc107' }}>Praia Sol </span>
          {/* <br /> */}
          <span style={{ color: '#45ce38ff' }}>Vereda</span>
        </div>
      </div>

      {/* Navegação */}
      <nav style={navStyle}>
        <Link to="/dashboard" onClick={handleLinkClick}
          style={{ ...linkStyle, ...(location.pathname.startsWith('/dashboard') ? activeLinkStyle : {}) }}>
          <FaHome style={iconStyle} /> Dashboard
        </Link>

        {user?.setor === 'Cct' && (
          <Link to="/importar-notificacoes" onClick={handleLinkClick}
            style={{ ...linkStyle, ...(location.pathname.startsWith('/importar-notificacoes') ? activeLinkStyle : {}) }}>
            <TbReport style={iconStyle} /> Importar Notificações
          </Link>
        )}

        {/* <Link to="/relatorio-solicitacoes" onClick={handleLinkClick}
          style={{ ...linkStyle, ...(location.pathname.startsWith('/relatorio-solicitacoes') ? activeLinkStyle : {}) }}>
          <BiSolidReport style={iconStyle} /> Visualizar Notificações
        </Link> */}

        <Link to="/relatorio-notificacoes" onClick={handleLinkClick}
          style={{ ...linkStyle, ...(location.pathname.startsWith('/relatorio-notificacoes') ? activeLinkStyle : {}) }}>
          <BiSolidReport style={iconStyle} /> Relatórios Notificações
        </Link>

        <Link to="/informacoes-notificacoes" onClick={handleLinkClick}
          style={{ ...linkStyle, ...(location.pathname.startsWith('/informacoes-notificacoes') ? activeLinkStyle : {}) }}>
          <TbReport style={iconStyle} /> Informações Notificações
        </Link>

        <Link to="/relatorio-juridico" onClick={handleLinkClick}
          style={{ ...linkStyle, ...(location.pathname.startsWith('/relatorio-juridico') ? activeLinkStyle : {}) }}>
          <TbReport style={iconStyle} /> Relatório Jurídico
        </Link>

        <Link to="/relatorio-financeiro" onClick={handleLinkClick}
          style={{ ...linkStyle, ...(location.pathname.startsWith('/relatorio-financeiro') ? activeLinkStyle : {}) }}>
          <TbReport style={iconStyle} /> Relatório Financeiro
        </Link>
      </nav>

      {/* Botão Sair */}
      <div style={{ padding: '1rem' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            backgroundColor: '#dc3545',
            color: '#fff',
            padding: '10px',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FaSignOutAlt style={{ marginRight: '8px' }} /> Sair
        </button>
      </div>
    </div>
  );
};

export default Sidebar;