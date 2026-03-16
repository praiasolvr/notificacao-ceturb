// src/pages/admin/RelatorioJuridico.tsx
import React, { useEffect, useState } from "react";
import {
    collection,
    getDocs,
    getDoc,
    doc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

import {
    Chart as ChartJS,
    ArcElement,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface Notificacao {
    codigo: string;
    data: string;
    garg: string;
}

const mesesLabel = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const ordemGarg = [
    "AS12", "AS13", "AS14", "AS15", "AS16",
    "SW21", "SW22", "SW23", "SW24", "SW25",
];

const RelatorioJuridico: React.FC = () => {
    const [gruposNotificacoes, setGruposNotificacoes] = useState<string[]>([]);
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [anoSel, setAnoSel] = useState<string | null>(null);
    const [mesSel, setMesSel] = useState<number | null>(null);
    const [gargSel, setGargSel] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [comentadas, setComentadas] = useState(0);
    const [comJulgamento, setComJulgamento] = useState(0);
    const [recorriveis, setRecorriveis] = useState(0);
    const [irrecorriveis, setIrrecorriveis] = useState(0);
    const [analiseEmProgresso, setAnaliseEmProgresso] = useState(false);

    // Carregar grupos
    useEffect(() => {
        async function carregarGrupos() {
            setLoading(true);
            const snapshot = await getDocs(collection(db, "notificacoes"));
            const grupos = snapshot.docs.map((doc) => doc.id);
            setGruposNotificacoes(grupos);
            setLoading(false);
        }
        carregarGrupos();
    }, []);

    // Carregar notificações
    useEffect(() => {
        if (gruposNotificacoes.length > 0 && notificacoes.length === 0) {
            carregarNotificacoes();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gruposNotificacoes]);

    async function carregarNotificacoes() {
        setLoading(true);

        const allSnaps = await Promise.all(
            gruposNotificacoes.map((grupo) =>
                getDocs(collection(db, "notificacoes", grupo, "notificacoes"))
            )
        );

        const todas: Notificacao[] = [];
        for (const snap of allSnaps) {
            snap.forEach((doc) => {
                const data = doc.data();
                if (data?.data && data?.garg && data?.codigo) {
                    todas.push({
                        data: data.data,
                        garg: data.garg,
                        codigo: data.codigo,
                    });
                }
            });
        }
        setNotificacoes(todas);
        setLoading(false);
    }

    // Analisar notificações (requisições paralelas)
    useEffect(() => {
        if (anoSel && mesSel !== null && gargSel) {
            analisarNotificacoes();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gargSel]);

    async function analisarNotificacoes() {
        if (analiseEmProgresso) return;
        setAnaliseEmProgresso(true);

        const notificacoesFiltradas = notificacoes.filter((n) => {
            const [_, mes, ano] = n.data.split("/");
            return (
                ano === anoSel &&
                parseInt(mes, 10) === (mesSel ?? 0) + 1 &&
                n.garg === gargSel
            );
        });

        let comentadasCount = 0;
        let julgadasCount = 0;
        let recorriveisCount = 0;
        let irrecorriveisCount = 0;

        await Promise.all(
            notificacoesFiltradas.map(async (n) => {
                const grupo = n.data.split("/")[2] + n.data.split("/")[1].padStart(2, "0");

                const [comentariosSnap, respostaDoc] = await Promise.all([
                    getDocs(collection(db, "notificacoes", grupo, "notificacoes", n.codigo, "comentarios")),
                    getDoc(doc(db, "notificacoes", grupo, "notificacoes", n.codigo, "julgamento", "resposta"))
                ]);

                if (!comentariosSnap.empty) comentadasCount++;

                if (respostaDoc.exists()) {
                    const status = (respostaDoc.data()?.status || "")
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .toLowerCase();

                    if (status !== "em analise") {
                        julgadasCount++;
                        if (status === "recorrivel") recorriveisCount++;
                        else if (status === "irrecorrivel") irrecorriveisCount++;
                    }
                }
            })
        );

        setComentadas(comentadasCount);
        setComJulgamento(julgadasCount);
        setRecorriveis(recorriveisCount);
        setIrrecorriveis(irrecorriveisCount);
        setAnaliseEmProgresso(false);
    }

    const anosDetectados = Array.from(
        new Set(gruposNotificacoes.map((g) => g.substring(0, 4)))
    ).sort();

    const notificacoesFiltradas = notificacoes.filter((n) => {
        const [_, mes, ano] = n.data.split("/");
        return (
            ano === anoSel &&
            parseInt(mes, 10) === (mesSel ?? 0) + 1 &&
            n.garg === gargSel
        );
    });

    const total = notificacoesFiltradas.length;

    const notificacoesPorMes = mesesLabel.map((_, idx) => {
        return notificacoes.filter((n) => {
            const [_, mes, ano] = n.data.split("/");
            return ano === anoSel && parseInt(mes, 10) === idx + 1;
        }).length;
    });

    const notificacoesPorGarg = ordemGarg.map((g) => {
        return notificacoes.filter((n) => {
            const [_, mes, ano] = n.data.split("/");
            return (
                ano === anoSel &&
                parseInt(mes, 10) === (mesSel ?? 0) + 1 &&
                n.garg === g
            );
        }).length;
    });

    // Gráficos
    const chartMeses = {
        labels: mesesLabel,
        datasets: [{
            label: "Notificações por mês",
            data: notificacoesPorMes,
            backgroundColor: "#007bff",
        }],
    };

    const chartGarg = {
        labels: ordemGarg,
        datasets: [{
            label: "Notificações por empresa",
            data: notificacoesPorGarg,
            backgroundColor: "#28a745",
        }],
    };

    const chartComentarios = {
        labels: ["Comentadas", "Em análise"],
        datasets: [{
            data: [comentadas, total - comentadas],
            backgroundColor: ["#28a745", "#6c757d"],
        }],
    };

    const chartJuridico = {
        labels: ["Com julgamento", "Sem julgamento"],
        datasets: [
            {
                data: [comJulgamento, total - comJulgamento],
                backgroundColor: ["#007bff", "#ffc107"],
            },
        ],
    };

    const chartRecorribilidade = {
        labels: ["Recorrível", "Irrecorrível", "Em análise"],
        datasets: [
            {
                data: [
                    recorriveis,
                    irrecorriveis,
                    total - recorriveis - irrecorriveis,
                ],
                backgroundColor: ["#17a2b8", "#dc3545", "#6c757d"],
            },
        ],
    };

    const estiloGrafico: React.CSSProperties = {
        maxWidth: 620,
        overflowX: "auto",
    };
    const handleMesClick = (_event: any, elements: any[]) => {
        if (elements.length > 0) {
            const index = elements[0].index;
            if (mesSel !== index) {
                setGargSel(null);
            }
            setMesSel(index);
        }
    };

    const handleGargClick = (_event: any, elements: any[]) => {
        if (elements.length > 0) {
            const index = elements[0].index;
            setGargSel(ordemGarg[index]);
        }
    };

    if (loading) {
        return (
            <div
                className="d-flex justify-content-center align-items-center"
                style={{ height: "100vh" }}
            >
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <h2>Relatório Jurídico</h2>

            <div className="mb-3">
                <label><strong>Ano:</strong></label>
                <select
                    className="form-control"
                    value={anoSel || ""}
                    onChange={(e) => {
                        setAnoSel(e.target.value || null);
                        setMesSel(null);
                        setGargSel(null);
                    }}
                >
                    <option value="">-- selecione --</option>
                    {anosDetectados.map((a) => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
            </div>

            {anoSel && (
                <div className="mb-4">
                    <h5>Notificações por mês</h5>
                    <Bar data={chartMeses} options={{ onClick: handleMesClick }} />
                </div>
            )}

            {mesSel !== null && (
                <div className="mb-4">
                    <h5>
                        Notificações por empresa em{" "}
                        {mesSel !== null && mesesLabel[mesSel] + " de " + anoSel}
                    </h5>
                    <Bar data={chartGarg} options={{ onClick: handleGargClick }} />
                </div>
            )}

            {gargSel && total > 0 && (
                <>
                    {analiseEmProgresso ? (
                        <div className="text-center my-4">
                            <div className="spinner-border text-secondary" role="status">
                                <span className="visually-hidden">Analisando...</span>
                            </div>
                            <p className="mt-2">Analisando dados jurídicos...</p>
                        </div>
                    ) : (
                        <div className="mb-4">
                            <h5>Indicadores — {gargSel}</h5>
                            <div className="d-flex flex-wrap gap-4" style={estiloGrafico}>
                                <div>
                                    <h6>% Comentadas</h6>
                                    <Pie data={chartComentarios} />
                                </div>
                                <div>
                                    <h6>% Avaliações Jurídicas</h6>
                                    <Pie data={chartJuridico} />
                                </div>
                                <div>
                                    <h6>% Recorribilidade</h6>
                                    <Pie data={chartRecorribilidade} />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RelatorioJuridico;