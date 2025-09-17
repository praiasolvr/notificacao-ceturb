import React, { useState, useEffect } from "react";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
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

import Swal from 'sweetalert2';

import { FaCommentDots } from "react-icons/fa6";

import { Spinner } from "react-bootstrap";


import ChatComentarios from "../../components/ChatComentarios";

import { useUser } from "../../contexts/UserContext";

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
    qtdComentarios: number;
    julgamentoStatus?: string | null;
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
    const { user } = useUser();

    const [julgamento, setJulgamento] = useState<{
        status: string;
        respondidoPorUid: string;
    } | null>(null);

    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [gruposNotificacoes, setGruposNotificacoes] = useState<string[]>([]);
    const [anos, setAnos] = useState<string[]>([]);
    const [anoSel, setAnoSel] = useState<string | null>(null);
    const [mesSel, setMesSel] = useState<number | null>(null);
    const [gargSel, setGargSel] = useState<string | null>(null);
    const [ocorrenciaSel, setOcorrenciaSel] = useState<string | null>(null);

    const [statusSel, setStatusSel] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);

    const [filtroSel, setFiltroSel] = useState<string | null>(null);

    const [chatAberto, setChatAberto] = useState<string | null>(null);


    const podeJulgar = (() => {
        if (!user || user.setor !== "Juridico") return false;
        if (!chatAberto) return false;

        const notificacao = notificacoes.find((n) => n.codigo === chatAberto);
        if (!notificacao || !notificacao.comentarios || notificacao.comentarios.length === 0) return false;

        // Se ainda não há julgamento, qualquer jurídico pode julgar
        if (!julgamento) return true;

        // Se já há julgamento, só o autor pode alterar
        return julgamento.respondidoPorUid === user.uid;
    })();

    useEffect(() => {
        carregarDecendios();
    }, []);

    useEffect(() => {
        if (gruposNotificacoes.length > 0) {
            carregarTodos();
        }
    }, [gruposNotificacoes]);

    useEffect(() => {
        const carregarJulgamento = async () => {
            if (!chatAberto) {
                setJulgamento(null);
                return;
            }

            const notificacao = notificacoes.find((n) => n.codigo === chatAberto);
            if (!notificacao) return;

            const grupo = getGrupoFromData(notificacao.data);
            const julgamentoRef = doc(
                db,
                "notificacoes",
                grupo,
                "notificacoes",
                chatAberto,
                "jugamento",
                "resposta"
            );

            try {
                const snap = await getDoc(julgamentoRef);
                if (snap.exists()) {
                    const dados = snap.data();
                    setJulgamento({
                        status: dados.status,
                        respondidoPorUid: dados.respondidoPorUid,
                    });
                    setStatusSel(dados.status); // atualiza visualmente
                } else {
                    setJulgamento(null);
                    setStatusSel(null);
                }
            } catch (err) {
                console.error("Erro ao carregar julgamento:", err);
            }
        };

        carregarJulgamento();
    }, [chatAberto]);

    //     useEffect(() => {
    //     const carregarComentariosParaNotificacoes = async () => {
    //         const notificacoesComComentarios = await Promise.all(
    //             notificacoes.map(async (n) => {
    //                 const [dia, mes, ano] = n.data.split("/");
    //                 const grupo = `${ano}${mes}`;
    //                 const comentarios = await carregarComentarios(grupo, n.codigo);
    //                 return { ...n, comentarios };
    //             })
    //         );
    //         setNotificacoes(notificacoesComComentarios);
    //     };

    //     carregarComentariosParaNotificacoes();
    // }, [notificacoes]);  // Isso será executado assim que as notificações forem carregadas


    async function carregarStatusJulgamento(grupo: string, codigo: string): Promise<string | null> {
        try {
            const julgamentoRef = doc(db, "notificacoes", grupo, "notificacoes", codigo, "jugamento", "resposta");
            const snap = await getDoc(julgamentoRef);
            return snap.exists() ? snap.data().status ?? null : null;
        } catch (err) {
            console.error(`Erro ao buscar julgamento de ${codigo}:`, err);
            return null;
        }
    }

    async function carregarComentarios(grupo: string, codigo: string): Promise<Comentario[]> {

        try {
            // Carrega os comentários do Firestore
            const comentariosRef = collection(db, "notificacoes", grupo, "notificacoes", codigo, "comentarios");
            const snapshot = await getDocs(comentariosRef);

            // console.log("Comentários carregados para", codigo, snapshot.docs.length);

            // Mapeia os dados dos comentários
            const comentariosData = snapshot.docs.map(doc => ({
                id: doc.id,
                autorNome: doc.data().autorNome,
                mensagem: doc.data().mensagem,
            }));

            // Atualiza a quantidade de comentários na notificação
            setNotificacoes((prevNotificacoes) =>
                prevNotificacoes.map((notificacao) =>
                    notificacao.codigo === codigo
                        ? {
                            ...notificacao,
                            comentarios: comentariosData, // Atualiza os comentários
                            qtdComentarios: comentariosData.length // Atualiza a quantidade de comentários
                        }
                        : notificacao
                )
            );

            // Retorna os comentários carregados
            return comentariosData;
        } catch (err) {
            console.error(`Erro ao carregar comentários para ${codigo}:`, err);
            return [];
        }
    }



    async function carregarDecendios() {
        setLoading(true); // 👈 começa carregamento
        const snapshot = await getDocs(collection(db, "notificacoes"));
        const grupos = snapshot.docs.map(doc => doc.id);
        setGruposNotificacoes(grupos);
    }

    async function carregarTodos() {
        setLoading(true); // 👈 começa carregamento
        const todas: Notificacao[] = [];
        const anosDetectados = new Set<string>();

        for (const grupo of gruposNotificacoes) {
            // console.log("Carregando grupo:", grupo);

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
                            qtdComentarios: 0, // Inicialmente zero, será atualizado depois
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
        setLoading(false); // 👈 terminou carregamento
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

    useEffect(() => {
        async function atualizarStatusDoMes() {
            if (mesSel === null || !anoSel) return;

            const notificacoesDoMes = notificacoes.filter((n) => {
                const [dia, mes, ano] = n.data.split("/");
                return ano === anoSel && parseInt(mes, 10) === mesSel + 1;
            });

            const atualizadas = await Promise.all(
                notificacoesDoMes.map(async (n) => {
                    const grupo = getGrupoFromData(n.data);
                    const status = await carregarStatusJulgamento(grupo, n.codigo);
                    return { ...n, julgamentoStatus: status };
                })
            );

            setNotificacoes((prev) =>
                prev.map((n) => {
                    const atualizada = atualizadas.find((a) => a.codigo === n.codigo);
                    return atualizada ? atualizada : n;
                })
            );
        }

        atualizarStatusDoMes();
    }, [mesSel, anoSel]);

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


    const handleSave = async () => {
        const status = statusSel ?? "Em Análise";

        if (!chatAberto) {
            Swal.fire({
                title: 'Ops!',
                text: 'Nenhuma notificação selecionada.',
                icon: 'warning',
            });
            return;
        }

        const notificacao = notificacoes.find((n) => n.codigo === chatAberto);
        if (!notificacao) {
            Swal.fire({
                title: 'Erro!',
                text: 'Notificação não encontrada.',
                icon: 'error',
            });
            return;
        }

        if (!notificacao.comentarios || notificacao.comentarios.length === 0) {
            Swal.fire({
                title: 'Atenção!',
                text: 'Não é possível julgar sem justificativas.',
                icon: 'info',
            });
            return;
        }

        if (!user || !user.uid) {
            Swal.fire({
                title: 'Erro!',
                text: 'Usuário não autenticado.',
                icon: 'error',
            });
            return;
        }

        const grupo = getGrupoFromData(notificacao.data);

        const julgamentoRef = doc(
            db,
            "notificacoes",
            grupo,
            "notificacoes",
            chatAberto,
            "jugamento",
            "resposta"
        );

        try {
            await setDoc(julgamentoRef, {
                status,
                atualizadoEm: new Date().toISOString(),
                respondidoPorUid: user.uid,
            });

            setNotificacoes((prev) =>
                prev.map((n) =>
                    n.codigo === chatAberto
                        ? { ...n, julgamentoStatus: status }
                        : n
                )
            );

            Swal.fire({
                title: 'Status atualizado!',
                text: `A notificação foi marcada como "${status}".`,
                icon: 'success',
                confirmButtonText: 'Fechar',
                timer: 2500,
                timerProgressBar: true,
            });
        } catch (error) {
            console.error("Erro ao salvar julgamento:", error);
            Swal.fire({
                title: 'Erro!',
                text: 'Erro ao salvar julgamento. Verifique o console.',
                icon: 'error',
            });
        }
    };

    const toggleStatus = (status: string) => {
        // Se clicar no que já está selecionado, desmarca tudo
        setStatusSel(prev => (prev === status ? null : status));
    };


    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
                <Spinner animation="border" variant="primary" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </Spinner>
            </div>
        );
    }

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

                    {/* Filtro de notificações */}
                    <div className="mb-3">
                        <label><strong>Filtrar notificações:</strong></label>
                        <select
                            className="form-control"
                            value={filtroSel || ""}
                            onChange={(e) => setFiltroSel(e.target.value || null)}
                        >
                            <option value="">-- todas --</option>
                            <option value="semComentarios">Sem comentários</option>
                            <option value="semJulgamento">Sem julgamento</option>
                        </select>
                    </div>

                    {/* Lista filtrada */}
                    <ul className="list-group">
                        {porGarg
                            .filter((n) => n.ocorrencia === ocorrenciaSel)
                            .filter((n) => {
                                if (filtroSel === "semComentarios") return n.qtdComentarios === 0;
                                if (filtroSel === "semJulgamento") return !n.julgamentoStatus;
                                return true;
                            })
                            .map((n, idx) => (
                                <li key={idx} className="list-group-item position-relative">
                                    {/* Ícone do chat */}
                                    <div
                                        className="position-absolute top-0 end-0 m-2 fs-2 cursor-pointer"
                                        onClick={() => setChatAberto(n.codigo)}
                                    >
                                        <FaCommentDots />
                                    </div>

                                    {/* Status de julgamento */}
                                    <div className="position-absolute" style={{ top: "48px", right: "12px" }}>
                                        {n.julgamentoStatus === "Recorrivel" && (
                                            <span className="text-success fw-bold">Recorrível</span>
                                        )}
                                        {n.julgamentoStatus === "Irrecorrivel" && (
                                            <span className="text-danger fw-bold">Irrecorrível</span>
                                        )}
                                    </div>

                                    {/* Badge de comentários */}
                                    <div
                                        className="position-absolute top-0 end-0 m-2 fs-5 cursor-pointer d-flex align-items-center"
                                        onClick={() => setChatAberto(n.codigo)}
                                    >
                                        <span
                                            className={`badge ms-1 ${n.qtdComentarios > 0 ? 'bg-danger' : 'bg-secondary'}`}
                                        >
                                            {n.qtdComentarios}
                                        </span>
                                    </div>

                                    {/* Dados da notificação */}
                                    <strong>Código:</strong> {n.codigo} <br />
                                    <strong>Data:</strong> {n.data} {n.hora} <br />
                                    <strong>Ocorrência:</strong> {n.ocorrencia} <br />
                                    <strong>Observação:</strong> {n.observacoes}<br />
                                    <strong>Local:</strong> {n.local}<br />
                                    <strong>Carro:</strong> {n.carro}<br />
                                    <strong>Linha:</strong> {n.linha}<br />
                                    <strong>Agente:</strong> {n.agente}<br />
                                </li>
                            ))}
                    </ul>
                </div>
            )}

            {gargSel && !ocorrenciaSel && (
                <div className="mb-4">
                    <h5>Detalhes — Todas ocorrências em {gargSel}</h5>

                    {/* Filtro de notificações */}
                    <div className="mb-3">
                        <label><strong>Filtrar notificações:</strong></label>
                        <select
                            className="form-control"
                            value={filtroSel || ""}
                            onChange={(e) => setFiltroSel(e.target.value || null)}
                        >
                            <option value="">-- todas --</option>
                            <option value="semComentarios">Sem comentários</option>
                            <option value="semJulgamento">Sem julgamento</option>
                        </select>
                    </div>

                    {/* Lista filtrada */}
                    <ul className="list-group">
                        {porGarg
                            .filter((n) => {
                                if (filtroSel === "semComentarios") return n.qtdComentarios === 0;
                                if (filtroSel === "semJulgamento") return !n.julgamentoStatus;
                                return true;
                            })
                            .map((n, idx) => (
                                <li key={idx} className="list-group-item position-relative">
                                    {/* Ícone do chat */}
                                    <div
                                        className="position-absolute top-0 end-0 m-2 fs-2 cursor-pointer"
                                        onClick={() => setChatAberto(n.codigo)}
                                    >
                                        <FaCommentDots />
                                    </div>

                                    {/* Status de julgamento */}
                                    <div className="position-absolute" style={{ top: "48px", right: "12px" }}>
                                        {n.julgamentoStatus === "Recorrivel" && (
                                            <span className="text-success fw-bold">Recorrível</span>
                                        )}
                                        {n.julgamentoStatus === "Irrecorrivel" && (
                                            <span className="text-danger fw-bold">Irrecorrível</span>
                                        )}
                                    </div>

                                    {/* Badge de comentários */}
                                    <div
                                        className="position-absolute top-0 end-0 m-2 fs-5 cursor-pointer d-flex align-items-center"
                                        onClick={() => setChatAberto(n.codigo)}
                                    >
                                        <span
                                            className={`badge ms-1 ${n.qtdComentarios > 0 ? 'bg-danger' : 'bg-secondary'}`}
                                        >
                                            {n.qtdComentarios}
                                        </span>
                                    </div>

                                    {/* Dados da notificação */}
                                    <strong>Código:</strong> {n.codigo} <br />
                                    <strong>Data:</strong> {n.data} {n.hora} <br />
                                    <strong>Ocorrência:</strong> {n.ocorrencia} <br />
                                    <strong>Observação:</strong> {n.observacoes}<br />
                                    <strong>Local:</strong> {n.local}<br />
                                    <strong>Carro:</strong> {n.carro}<br />
                                    <strong>Linha:</strong> {n.linha}<br />
                                    <strong>Agente:</strong> {n.agente}<br />
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
                                <h5 className="modal-title">Código / N° Notificação — {chatAberto}</h5>
                                <button type="button" className="btn-close" onClick={() => setChatAberto(null)} />
                            </div>


                            <div className="modal-body">
                                {/* Somente o juridico irá ter acesso a essa seleção */}
                                <span>
                                    <strong>Recurso:</strong>
                                </span>
                                <div className="d-flex align-items-center gap-3">
                                    {/* Recorrível */}
                                    <div className="form-check form-check-inline">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="recorrivel"
                                            checked={statusSel === "Recorrivel"}
                                            onChange={() => toggleStatus("Recorrivel")}
                                            disabled={!podeJulgar}
                                        />
                                        <label className="form-check-label" htmlFor="recorrivel">
                                            Recorrível
                                        </label>
                                    </div>

                                    {/* Irrecorrível */}
                                    <div className="form-check form-check-inline">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="irrecorrivel"
                                            checked={statusSel === "Irrecorrivel"}
                                            onChange={() => toggleStatus("Irrecorrivel")}
                                            disabled={!podeJulgar}
                                        />
                                        <label className="form-check-label" htmlFor="irrecorrivel">
                                            Irrecorrível
                                        </label>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={handleSave}
                                        disabled={!podeJulgar}
                                    >
                                        Salvar
                                    </button>
                                </div>

                                <ChatComentarios
                                    grupo={anoSel && mesSel !== null ? `${anoSel}${(mesSel + 1).toString().padStart(2, "0")}` : "indefinido"}
                                    codigo={chatAberto}
                                    onClose={() => setChatAberto(null)}
                                    setNotificacoes={setNotificacoes} // ✅ aqui está a correção
                                />

                            </div>
                        </div>
                    </div>
                </div>
            )}




        </div>
    );
};

export default RelatorioNotificacoes;