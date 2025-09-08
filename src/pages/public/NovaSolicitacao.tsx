import React, { useEffect, useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { FaClipboard, FaRegClock, FaExclamationCircle } from 'react-icons/fa';

const NovaSolicitacao: React.FC = () => {
  const { user } = useUser();

  return (
    <div className="container mt-4">
      <h2><FaClipboard className="me-2" /> Responder Notificações</h2>

      <strong>Selecione o ano:</strong>
      <select className="form-select mb-3">
        <option value="">Selecione um período</option>
        <option value="1">2025</option>
        <option value="2">2024</option>
        <option value="3">2023</option>
      </select>

      <strong>Selecione o mês:</strong>
      <select className="form-select mb-3">
        <option value="">Selecione um período</option>
        <option value="1">Janeiro</option>
        <option value="2">Fevereiro</option>
        <option value="3">Março</option>
        <option value="4">Abril</option>
        <option value="5">Maio</option>
        <option value="6">Junho</option>
        <option value="7">Julho</option>
        <option value="8">Agosto</option>
        <option value="9">Setembro</option>
        <option value="10">Outubro</option>
        <option value="11">Novembro</option>
        <option value="12">Dezembro</option>
      </select>

      <strong>Selecione o decêndio:</strong>
      <select className="form-select mb-3">
        <option value="">Selecione um período</option>
        <option value="1">1º Decêndio</option>
        <option value="2">2º Decêndio</option>
        <option value="3">3º Decêndio</option>
      </select>
    </div>
  );
};

export default NovaSolicitacao;