import React, { useState, useEffect } from "react";
import {
    collection,
    doc,
    getDoc,
    getDocs,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

import {
    Chart,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { FaCommentDots } from "react-icons/fa6";


import ChatComentarios from "../../components/ChatComentarios";

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface Comentario {
    id: string;
    autorNome: string;
    mensagem: string;
}

interface Notificacao {
    data: string;
    garg: string;
    ocorrencia: string;
    observacoes?: string;
    hora: string;
    local: string;
    carro?: string;
    linha?: string;
    agente: string;
    codigo: string;
    comentarios?: Comentario[]; // <- aqui está a mágica
}

const ordemGarg = [
    "AS12", "AS13", "AS14", "AS15", "AS16",
    "SW21", "SW22", "SW23", "SW24", "SW25",
];

const mesesLabel = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const RelatorioNotificacoes: React.FC = () => {
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [gruposNotificacoes, setGruposNotificacoes] = useState<string[]>([]);
    const [anos, setAnos] = useState<string[]>([]);
    const [anoSel, setAnoSel] = useState<string | null>(null);
    const [mesSel, setMesSel] = useState<number | null>(null);
    const [gargSel, setGargSel] = useState<string | null>(null);
    const [ocorrenciaSel, setOcorrenciaSel] = useState<string | null>(null);


    const [chatAberto, setChatAberto] = useState<string | null>(null);


    useEffect(() => {
        carregarDecendios();
    }, []);

    useEffect(() => {
        if (gruposNotificacoes.length > 0) {
            carregarTodos();
        }
    }, [gruposNotificacoes]);

    async function carregarComentarios(grupo: string, codigo: string): Promise<Comentario[]> {
        try {
            const comentariosRef = collection(db, "notificacoes", grupo, "notificacoes", codigo, "comentarios");
            const snapshot = await getDocs(comentariosRef);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                autorNome: doc.data().autorNome,
                mensagem: doc.data().mensagem,
            }));
        } catch (err) {
            console.error(`Erro ao carregar comentários para ${codigo}:`, err);
            return [];
        }
    }

    async function carregarDecendios() {
        const snapshot = await getDocs(collection(db, "notificacoes"));
        const grupos = snapshot.docs.map(doc => doc.id);
        setGruposNotificacoes(grupos);
    }

    async function carregarTodos() {
        const todas: Notificacao[] = [];
        const anosDetectados = new Set<string>();

        for (const grupo of gruposNotificacoes) {
            console.log("Carregando grupo:", grupo);

            const notificacoesRef = collection(db, "notificacoes", grupo, "notificacoes");

            try {
                const notificacoesSnap = await getDocs(notificacoesRef);
                const anoGrupo = grupo.substring(0, 4);
                anosDetectados.add(anoGrupo);

                for (const docSnap of notificacoesSnap.docs) {
                    const data = docSnap.data();

                    if (data?.data && data?.garg && data?.ocorrencia) {
                        todas.push({
                            data: data.data,
                            garg: data.garg,
                            ocorrencia: data.ocorrencia,
                            observacoes: data.observacoes || "",
                            hora: data.hora || "",
                            local: data.local || "",
                            carro: data.carro || "",
                            linha: data.linha || "",
                            agente: data.agente || "",
                            codigo: data.codigo || "",
                        });
                    } else {
                        console.warn("Dados incompletos em:", docSnap.ref.path);
                    }
                }
            } catch (err) {
                console.error("Erro lendo notificações do grupo:", grupo, err);
            }
        }

        // Carregar comentários para cada notificação
        // const todasComComentarios = await Promise.all(
        //     todas.map(async (n) => {
        //         const [dia, mes, ano] = n.data.split("/");
        //         const grupo = `${ano}${mes}`;
        //         const comentarios = await carregarComentarios(grupo, n.codigo);
        //         return { ...n, comentarios };
        //     })
        // );

        setNotificacoes(todas);
        setAnos(Array.from(anosDetectados).sort());

        // console.log("Total de notificações carregadas:", todasComComentarios.length);
    }

    useEffect(() => {
        async function carregarComentariosDoGarg() {
            if (!gargSel) return;

            const notificacoesDoGarg = notificacoes.filter(n => n.garg === gargSel);
            const notificacoesComComentarios = await Promise.all(
                notificacoesDoGarg.map(async (n) => {
                    const [dia, mes, ano] = n.data.split("/");
                    const grupo = `${ano}${mes}`;
                    const comentarios = await carregarComentarios(grupo, n.codigo);
                    return { ...n, comentarios };
                })
            );

            // Aqui você pode atualizar um novo estado, tipo:
            // setNotificacoesComComentarios(notificacoesComComentarios);
        }

        carregarComentariosDoGarg();
    }, [gargSel]);

    const porAno = anoSel
        ? notificacoes.filter((n) => n.data.split("/")[2] === anoSel)
        : [];

    const porMes =
        mesSel !== null
            ? porAno.filter((n) => parseInt(n.data.split("/")[1], 10) === mesSel + 1)
            : [];

    const porGarg = gargSel ? porMes.filter((n) => n.garg === gargSel) : [];

    const totalPorMes = Array.from({ length: 12 }, (_, i) =>
        porAno.filter((n) => parseInt(n.data.split("/")[1], 10) === i + 1).length
    );

    const mapaGarg: Record<string, number> = {};
    porMes.forEach((n) => {
        mapaGarg[n.garg] = (mapaGarg[n.garg] || 0) + 1;
    });

    const gargKeysOrdenadas = ordemGarg.filter((g) => g in mapaGarg);
    const gargValuesOrdenados = gargKeysOrdenadas.map((g) => mapaGarg[g]);

    const mapaOc: Record<string, number> = {};
    porGarg.forEach((n) => {
        mapaOc[n.ocorrencia] = (mapaOc[n.ocorrencia] || 0) + 1;
    });

    const chartMeses = {
        labels: mesesLabel,
        datasets: [
            {
                label: "Notificações/mês",
                data: totalPorMes,
                backgroundColor: "#17a2b8",
            },
        ],
    };

    const chartGarg = {
        labels: gargKeysOrdenadas,
        datasets: [
            {
                label: "Por GARG",
                data: gargValuesOrdenados,
                backgroundColor: "#ffc107",
            },
        ],
    };

    const chartOc = {
        labels: Object.keys(mapaOc),
        datasets: [
            {
                label: "Por Ocorrência",
                data: Object.values(mapaOc),
                backgroundColor: "#dc3545",
            },
        ],
    };

    const estiloGrafico = {
        maxHeight: 320,
        maxWidth: 620,
        overflow: "auto",
    };


    const getGrupoFromData = (data: string): string => {
        const [dia, mes, ano] = data.split("/"); // "21/02/2025" → ["21", "02", "2025"]
        return `${ano}${mes}`; // → "202502"
    };

    return (
        <div className="container mt-4">
            <h2>Relatório de Notificações por Decêndio</h2>

            <div className="mb-3">
                <label><strong>Ano:</strong></label>
                <select
                    className="form-control"
                    value={anoSel || ""}
                    onChange={(e) => {
                        setAnoSel(e.target.value || null);
                        setMesSel(null);
                        setGargSel(null);
                        setOcorrenciaSel(null);
                    }}
                >
                    <option value="">-- selecione --</option>
                    {anos.map((a) => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
            </div>

            {anoSel && (
                <div className="mb-4">
                    <h5>Notificações em {anoSel}</h5>
                    <div style={estiloGrafico}>
                        <Bar
                            data={chartMeses}
                            options={{
                                onClick: (_, elems) => {
                                    if (elems.length) {
                                        setMesSel(elems[0].index);
                                        setGargSel(null);
                                        setOcorrenciaSel(null);
                                    }
                                },
                                plugins: { legend: { display: true } },
                                responsive: true,
                                maintainAspectRatio: false,
                            }}
                            height={300}
                            width={600}
                        />
                    </div>
                </div>
            )}

            {mesSel !== null && (
                <div className="mb-4">
                    <h5>GARGs em {mesesLabel[mesSel]}</h5>
                    <div style={estiloGrafico}>
                        <Bar
                            data={chartGarg}
                            options={{
                                onClick: (_, elems) => {
                                    if (elems.length) {
                                        const idx = elems[0].index;
                                        setGargSel(gargKeysOrdenadas[idx]);
                                        setOcorrenciaSel(null);
                                    }
                                },
                                plugins: { legend: { display: true } },
                                responsive: true,
                                maintainAspectRatio: false,
                            }}
                            height={300}
                            width={600}
                        />
                    </div>
                </div>
            )}

            {gargSel && (
                <div className="mb-4">
                    <h5>Ocorrências — GARG: {gargSel}</h5>
                    <div style={estiloGrafico}>
                        <Bar
                            data={chartOc}
                            options={{
                                onClick: (_, elems) => {
                                    if (elems.length) {
                                        const idx = elems[0].index;
                                        const codigo = Object.keys(mapaOc)[idx];
                                        setOcorrenciaSel(codigo);
                                    }
                                },
                                plugins: { legend: { display: true } },
                                responsive: true,
                                maintainAspectRatio: false,
                            }}
                            height={300}
                            width={600}
                        />
                    </div>
                </div>
            )}
            {gargSel && ocorrenciaSel && (
                <div className="mb-4">
                    <h5>Detalhes — Ocorrência {ocorrenciaSel} em {gargSel}</h5>
                    <ul className="list-group">
                        {porGarg
                            .filter((n) => n.ocorrencia === ocorrenciaSel)
                            .map((n, idx) => (
                                <li key={idx} className="list-group-item">
                                    <div
                                        className="position-absolute top-0 end-0 m-2 fs-2 cursor-pointer"
                                        onClick={() => setChatAberto(n.codigo)}
                                    >
                                        <FaCommentDots />
                                    </div>
                                    <div className="position-absolute top-0 end-0 m-2 fs-5 cursor-pointer d-flex align-items-center" onClick={() => setChatAberto(n.codigo)}>
                                        <span className="badge bg-secondary ms-1">{n.comentarios?.length || 0}</span>
                                    </div>
                                    <strong>Codigo:</strong> {n.codigo} <br />
                                    <strong>Data:</strong> {n.data} {n.hora} <br />
                                    <strong>Ocorrência:</strong> {n.ocorrencia} <br />
                                    <strong>Observação:</strong> {n.observacoes}<br />
                                    <strong>Local:</strong> {n.local}<br />
                                    <strong>Carro:</strong> {n.carro}<br />
                                    <strong>Linha:</strong> {n.linha}<br />
                                    <strong>Agente:</strong> {n.agente}<br />

                                    {/* <ChatComentarios
                                    grupo={anoSel ? `${anoSel}01` : "202301"}
                                    codigo={"EXEMPLO123"}
                                    onClose={() =>
                                        alert('Fechar chat')}
                                /> */}


                                </li>
                            ))}
                    </ul>
                </div>
            )}

            {gargSel && !ocorrenciaSel && (
                <div className="mb-4">
                    <h5>Detalhes — Todas ocorrências em {gargSel}</h5>
                    <ul className="list-group">
                        {porGarg.map((n, idx) => (
                            <li key={idx} className="list-group-item">
                                <div
                                    className="position-absolute top-0 end-0 m-2 fs-2 cursor-pointer"
                                    onClick={() => setChatAberto(n.codigo)}
                                >
                                    <FaCommentDots />
                                </div>
                                <div className="position-absolute top-0 end-0 m-2 fs-5 cursor-pointer d-flex align-items-center" onClick={() => setChatAberto(n.codigo)}>

                                    <span className="badge bg-secondary ms-1">{n.comentarios?.length || 0}</span>
                                </div>
                                <strong>Codigo:</strong> {n.codigo} <br />
                                <strong>Data:</strong> {n.data} {n.hora} <br />
                                <strong>Ocorrência:</strong> {n.ocorrencia} <br />
                                <strong>Observação:</strong> {n.observacoes}<br />
                                <strong>Local:</strong> {n.local}<br />
                                <strong>Carro:</strong> {n.carro}<br />
                                <strong>Linha:</strong> {n.linha}<br />
                                <strong>Agente:</strong> {n.agente}<br />

                                {/* <ChatComentarios
                                    grupo={anoSel ? `${anoSel}01` : "202301"}
                                    codigo={"EXEMPLO123"}
                                    onClose={() =>
                                        alert('Fechar chat')}
                                /> */}


                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {chatAberto && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Comentários — {chatAberto}</h5>
                                <button type="button" className="btn-close" onClick={() => setChatAberto(null)}></button>
                            </div>
                            <div className="modal-body">
                                <ChatComentarios
                                    grupo={anoSel && mesSel !== null ? `${anoSel}${(mesSel + 1).toString().padStart(2, "0")}` : "indefinido"}
                                    codigo={chatAberto}
                                    onClose={() => setChatAberto(null)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Componente de chat de comentários */}
            {/* Substitua 'grupo' e 'codigo' pelos valores reais conforme necessário */}
            {/* <ChatComentarios
                grupo={anoSel ? `${anoSel}01` : "202301"}
                codigo={"EXEMPLO123"}
                onClose={() =>
                    alert('Fechar chat')}
            /> */}

        </div>
    );
};

export default RelatorioNotificacoes;