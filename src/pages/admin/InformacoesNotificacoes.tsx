import React from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../../contexts/UserContext';
import { colorAzul, colorBranco } from '../../values/colors';
import notificacoes from '../../assets/ocorrencias_notificacoes_completo.json'; // Importa o JSON direto

const InformacoesNotificacoes = () => {
  const { user } = useUser();

  return (
    <div
      className="container mt-5"
      style={{
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '1000px',
      }}
    >
      <h2
        style={{
          color: colorAzul,
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '20px',
        }}
      >
        📋 Informações das Notificações
      </h2>

      <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
        <table className="table table-bordered table-hover">
          <thead className="table-light">
            <tr>
              <th style={{ width: '100px' }}>Código</th>
              <th style={{ width: '150px' }}>Valor (KM)</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>
            {notificacoes.map((item: any, index: number) => (
              <tr key={index}>
                <td>{item.codigo}</td>
                <td>{item.valor}</td>
                <td>{item.descricao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InformacoesNotificacoes;