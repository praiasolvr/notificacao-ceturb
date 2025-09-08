import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

interface Notificacao {
  agente: string;
  atualizadoEm: string;
  carro: string;
  codigo: string;
  data: string;
  garg: string;
  hora: string;
  linha: string;
  local: string;
  multa: string;
  observacoes: string;
  ocorrencia: string;
}

const MinhasSolicitacoes: React.FC = () => {
  const [periodosDisponiveis, setPeriodosDisponiveis] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState('');
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(false);

  // 🟢 Buscar todos os períodos disponíveis
  const buscarPeriodos = async () => {
    try {
      const rootCollection = collection(db, 'notificacoes');
      const snapshot = await getDocs(rootCollection);

      const periodos: string[] = snapshot.docs.map(doc => doc.id);

      console.log('Períodos encontrados:', periodos);
      setPeriodosDisponiveis(periodos);

      if (periodos.length > 0) {
        setPeriodo(periodos[0]); // Seleciona o primeiro período automaticamente
      }
    } catch (error) {
      console.error('Erro ao buscar períodos:', error);
    }
  };

  // 🟢 Buscar as notificações de um período
  const buscarNotificacoes = async () => {
    if (!periodo) return;

    setCarregando(true);
    try {
      const notificacoesRef = collection(db, `notificacoes/${periodo}/notificacoes`);
      const snapshot = await getDocs(notificacoesRef);

      const lista: Notificacao[] = snapshot.docs.map(doc => doc.data() as Notificacao);
      console.log(`Notificações no período ${periodo}:`, lista);

      setNotificacoes(lista);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
    setCarregando(false);
  };

  useEffect(() => {
    async function teste() {
      try {
        const ref = collection(db, 'notificacoes');
        const snap = await getDocs(ref);
        console.log('== TESTE READ ==');
        console.log('projectId interno:', (db as any)?._databaseId?.projectId);
        console.log('docs encontrados:', snap.docs.length);
      } catch (e) {
        console.error('Erro no teste:', e);
      }
    }
    teste();
  }, []);

  useEffect(() => {
    buscarNotificacoes();
  }, [periodo]);

  return (
    <div className="container mt-4">
      <h2>Notificações</h2>

      <div className="mb-3">
        <label>Selecione o período:</label>
        <select
          className="form-control"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
        >
          <option value="">-- Selecione --</option>
          {periodosDisponiveis.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {carregando ? (
        <p>Carregando notificações...</p>
      ) : (
        <div>
          {notificacoes.length === 0 ? (
            <p>Nenhuma notificação encontrada.</p>
          ) : (
            <ul className="list-group">
              {notificacoes.map((notif, index) => (
                <li key={index} className="list-group-item">
                  <strong>Código:</strong> {notif.codigo} <br />
                  <strong>Data:</strong> {notif.data} <br />
                  <strong>Hora:</strong> {notif.hora} <br />
                  <strong>Agente:</strong> {notif.agente} <br />
                  <strong>Local:</strong> {notif.local} <br />
                  <strong>Ocorrência:</strong> {notif.ocorrencia}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default MinhasSolicitacoes;