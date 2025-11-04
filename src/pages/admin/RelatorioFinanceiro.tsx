// src/pages/admin/RelatorioFinanceiro.tsx
import React, { useEffect, useState } from "react";
import {
    collection,
    getDocs,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

import ChartDataLabels from "chartjs-plugin-datalabels";


import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Title,
} from "chart.js";

import { Chart, Bar } from "react-chartjs-2";
ChartJS.register(
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Title,
    ChartDataLabels // 👈 registre aqui
);

import { Spinner } from "react-bootstrap";
import { useUser } from "../../contexts/UserContext";
import ocorrenciasData from "../../assets/ocorrencias_notificacoes_completo.json";

import IconOdometro from '../../assets/icons-odometro.png';

interface Notificacao {
    data: string;
    garg: string;
    ocorrencia: string;
    codigo: string;
}

const barOptionsComLabels = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        datalabels: {
            anchor: 'end',
            align: 'top',
            color: '#000',
            font: { weight: 'bold' },
            formatter: (value: number) => Math.round(value).toString()
        }
    }
};

const ordemGarg = [
    "AS12", "AS13", "AS14", "AS15", "AS16",
    "SW21", "SW22", "SW23", "SW24", "SW25",
];

const mesesLabel = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// valores por KM conforme seu pedido
const getValorPorKm = (garg: string): number => {
    if (!garg) return 0;
    if (garg.startsWith("AS")) return 9.487;
    if (garg.startsWith("SW")) return 9.9126;
    return 0;
};

// busca KM (campo 'valor' do JSON) a partir do código da ocorrencia
const getKmDaOcorrencia = (ocorrencia: string): number => {
    const found = (ocorrenciasData as any[]).find((it) => String(it.codigo) === String(ocorrencia));
    return found ? Number(found.valor) : 0;
};

const RelatorioFinanceiro: React.FC = () => {
    const { user } = useUser();
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [anos, setAnos] = useState<string[]>([]);
    const [anoSel, setAnoSel] = useState<string | null>(null);
    const [mesSel, setMesSel] = useState<number | null>(null);
    const [gargSel, setGargSel] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // carrega todas notificações
    useEffect(() => {
        const carregarTodos = async () => {
            setLoading(true);
            try {
                const snapshot = await getDocs(collection(db, "notificacoes"));
                const anosDetectados = new Set<string>();
                const todas: Notificacao[] = [];

                for (const grupoDoc of snapshot.docs) {
                    const grupo = grupoDoc.id;
                    const anoGrupo = grupo.substring(0, 4);
                    anosDetectados.add(anoGrupo);

                    const notificacoesRef = collection(db, "notificacoes", grupo, "notificacoes");
                    const notifSnap = await getDocs(notificacoesRef);
                    notifSnap.forEach(docSnap => {
                        const data = docSnap.data() as any;
                        if (data?.data && data?.garg && data?.ocorrencia && data?.codigo) {
                            todas.push({
                                data: data.data,
                                garg: data.garg,
                                ocorrencia: String(data.ocorrencia),
                                codigo: data.codigo,
                            });
                        }
                    });
                }

                setNotificacoes(todas);
                setAnos(Array.from(anosDetectados).sort());
            } catch (err) {
                console.error("Erro ao carregar notificações:", err);
            } finally {
                setLoading(false);
            }
        };

        carregarTodos();
    }, []);

    const porAno = anoSel ? notificacoes.filter(n => n.data.split("/")[2] === anoSel) : [];
    const porMes = mesSel !== null ? porAno.filter(n => parseInt(n.data.split("/")[1], 10) === mesSel + 1) : [];
    const porGarg = gargSel ? porMes.filter(n => n.garg === gargSel) : [];

    const totalPorMes = Array.from({ length: 12 }, (_, i) =>
        porAno.filter(n => parseInt(n.data.split("/")[1], 10) === i + 1).length
    );

    const mapaGarg: Record<string, number> = {};
    const mapaKm: Record<string, number> = {};
    const mapaFinanceiro: Record<string, number> = {};
    porMes.forEach(n => {
        mapaGarg[n.garg] = (mapaGarg[n.garg] || 0) + 1;
        const km = getKmDaOcorrencia(n.ocorrencia);
        mapaKm[n.garg] = (mapaKm[n.garg] || 0) + km;
        mapaFinanceiro[n.garg] = (mapaFinanceiro[n.garg] || 0) + km * getValorPorKm(n.garg);
    });

    const gargKeysOrdenadas = ordemGarg.filter(g => g in mapaGarg);
    const gargValuesOrdenados = gargKeysOrdenadas.map(g => mapaGarg[g] || 0);
    const gargKmOrdenado = gargKeysOrdenadas.map(g => mapaKm[g] || 0);
    const gargFinanceiroOrdenado = gargKeysOrdenadas.map(g => +(mapaFinanceiro[g] || 0));

    const estiloGrafico = { maxHeight: 320, maxWidth: 620, overflow: "auto" };

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
            <h2>📊 Relatório de Notificações Anual</h2>

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
                    {anos.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>

            {anoSel && (
                <div className="mb-4">
                    <h5>Notificações em {anoSel}</h5>
                    <div style={estiloGrafico}>
                        <Bar
                            data={{
                                labels: mesesLabel,
                                datasets: [{ label: "Notificações/mês", data: totalPorMes, backgroundColor: "#17a2b8" }],
                            }}
                            options={{
                                onClick: (_, elems) => { if (elems.length) setMesSel(elems[0].index); },
                                plugins: { legend: { display: true } },
                                responsive: true,
                                maintainAspectRatio: false,
                            }}
                        />
                    </div>
                </div>
            )}

            {mesSel !== null && (
                <>
                    <div className="mb-4">
                        <h5>🔢 Quantidade por Garagem em {mesesLabel[mesSel]}</h5>
                        <div style={estiloGrafico}>
                            <Bar
                                data={{
                                    labels: gargKeysOrdenadas,
                                    datasets: [{ label: "Qtde Notificações", data: gargValuesOrdenados, backgroundColor: "#ffc107" }],
                                }}
                                options={{
                                    onClick: (_, elems) => { if (elems.length) setGargSel(gargKeysOrdenadas[elems[0].index]); },
                                    plugins: { legend: { display: true } },
                                    responsive: true,
                                    maintainAspectRatio: false,
                                }}
                            />
                        </div>
                    </div>

                    <div className="mb-4">


                        <h5>

                            <img height={22} src={IconOdometro} alt='icon odomentro quilometragem' />
                            &nbsp; Total KM por Garagem

                        </h5>
                        <div style={estiloGrafico}>
                            <Bar
                                data={{
                                    labels: gargKeysOrdenadas,
                                    datasets: [{ label: "Total KM", data: gargKmOrdenado, backgroundColor: "rgba(0,123,255,0.7)" }],
                                }}
                                options={{ responsive: true, maintainAspectRatio: false }}
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <h5>💰 Total Penalização por Garagem (R$)</h5>
                        <div style={estiloGrafico}>
                            <Bar
                                data={{
                                    labels: gargKeysOrdenadas,
                                    datasets: [{
                                        label: "R$",
                                        data: gargKeysOrdenadas.map(g => Math.round(mapaFinanceiro[g] || 0)),
                                        backgroundColor: "rgba(40,167,69,0.7)"
                                    }],
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { display: true },
                                        datalabels: {
                                            anchor: 'end',
                                            align: 'top',
                                            color: '#000',
                                            font: { weight: 'bold' },
                                            formatter: (value: number) => `R$ ${value.toLocaleString("pt-BR")}`
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </>
            )}

            {gargSel && (
                <>
                    <h5>Detalhamento — {gargSel} (por Ocorrência)</h5>
                    <div className="d-flex gap-4 flex-wrap">
                        {/* Agrupar por ocorrência */}
                        {(() => {
                            const ocorrenciasMap: Record<string, { km: number; valor: number }> = {};
                            porGarg.forEach(n => {
                                const km = getKmDaOcorrencia(n.ocorrencia);
                                const valor = km * getValorPorKm(n.garg);
                                if (!ocorrenciasMap[n.ocorrencia]) {
                                    ocorrenciasMap[n.ocorrencia] = { km, valor };
                                } else {
                                    ocorrenciasMap[n.ocorrencia].km += km;
                                    ocorrenciasMap[n.ocorrencia].valor += valor;
                                }
                            });

                            const labels = Object.keys(ocorrenciasMap);
                            const kmData = labels.map(l => ocorrenciasMap[l].km);
                            const valorData = labels.map(l => ocorrenciasMap[l].valor);
                            const cores = labels.map((_, i) => `hsl(${(i * 60) % 360}, 70%, 60%)`);

                            const totalKm = kmData.reduce((acc, v) => acc + v, 0);
                            const totalValor = valorData.reduce((acc, v) => acc + v, 0);

                            return (
                                <>
                                    <div style={{ width: 300, height: 350 }}>
                                        <h6>Quilometragem (KM)</h6>
                                        <Chart
                                            type="pie"
                                            data={{
                                                labels,
                                                datasets: [{ label: "KM", data: kmData, backgroundColor: cores }],
                                            }}
                                            options={{ responsive: true, maintainAspectRatio: false }}
                                        />
                                        <div className="mt-2 text-center">
                                            <strong>Total:</strong> {totalKm.toLocaleString("pt-BR")} km
                                        </div>
                                    </div>

                                    <div style={{ width: 300, height: 350 }}>
                                        <h6>Financeiro (R$)</h6>
                                        <Chart
                                            type="pie"
                                            data={{
                                                labels,
                                                datasets: [
                                                    {
                                                        label: "R$",
                                                        data: valorData,
                                                        backgroundColor: cores,
                                                    },
                                                ],
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    datalabels: {
                                                        formatter: (value) => {
                                                            return `R$ ${Math.floor(value).toLocaleString('pt-BR')}`;
                                                        },
                                                        color: '#fff',
                                                        font: {
                                                            weight: 'bold',
                                                            size: 14,
                                                        },
                                                    },
                                                },
                                            }}
                                            plugins={[ChartDataLabels]}
                                        />
                                        <div className="mt-2 text-center">
                                            <strong>Total:</strong> R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </>
            )}
        </div>
    );
};

export default RelatorioFinanceiro;
