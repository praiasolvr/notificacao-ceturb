// src/pages/admin/RelatorioFinanceiro.tsx
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
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
    ChartDataLabels
);

import { Spinner } from "react-bootstrap";
import ocorrenciasData from "../../assets/ocorrencias_notificacoes_completo.json";
import IconOdometro from "../../assets/icons-odometro.png";

interface Notificacao {
    data: string;      // "dd/MM/yyyy"
    garg: string;      // AS12, SW21, etc
    ocorrencia: string;
    codigo: string;
    criadoEm: Date;    // usado para definir a tarifa
}

interface Vigencia {
    dataInicio: Date;
    valorKm: number;
}

const ordemGarg = [
    "AS12", "AS13", "AS14", "AS15", "AS16",
    "SW21", "SW22", "SW23", "SW24", "SW25",
];

const mesesLabel = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const getKmDaOcorrencia = (ocorrencia: string): number => {
    const found = (ocorrenciasData as any[]).find(
        (it) => String(it.codigo) === String(ocorrencia)
    );
    return found ? Number(found.valor) : 0;
};

const RelatorioFinanceiro: React.FC = () => {
    const [loading, setLoading] = useState(true);

    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [vigAS, setVigAS] = useState<Vigencia[]>([]);
    const [vigSW, setVigSW] = useState<Vigencia[]>([]);

    const [anos, setAnos] = useState<string[]>([]);
    const [anoSel, setAnoSel] = useState<string | null>(null);
    const [mesSel, setMesSel] = useState<number | null>(null);
    const [gargSel, setGargSel] = useState<string | null>(null);

    // Carrega TODO o histórico de tarifa (AS + SW) e TODAS as notificações uma única vez
    useEffect(() => {
        const carregar = async () => {
            setLoading(true);
            try {
                // 1) Histórico de tarifa
                const carregarHistorico = async (consorcio: string): Promise<Vigencia[]> => {
                    const ref = collection(db, "valorKm", consorcio, "historico");
                    const snap = await getDocs(ref);
                    return snap.docs
                        .map((d) => {
                            const data = d.data() as any;
                            return {
                                dataInicio: new Date(data.dataInicio),
                                valorKm: Number(data.valorKm),
                            };
                        })
                        .sort(
                            (a, b) =>
                                b.dataInicio.getTime() - a.dataInicio.getTime()
                        ); // mais recente primeiro
                };

                const [asHist, swHist] = await Promise.all([
                    carregarHistorico("atlanticoSul"),
                    carregarHistorico("sudoeste"),
                ]);

                setVigAS(asHist);
                setVigSW(swHist);

                // 2) Notificações
                const snapshot = await getDocs(collection(db, "notificacoes"));
                const anosDetectados = new Set<string>();
                const todas: Notificacao[] = [];

                for (const grupoDoc of snapshot.docs) {
                    const grupo = grupoDoc.id; // ex: "2025_01_decendio1" ou "202501"
                    const anoGrupo = grupo.substring(0, 4);
                    anosDetectados.add(anoGrupo);

                    const notificacoesRef = collection(
                        db,
                        "notificacoes",
                        grupo,
                        "notificacoes"
                    );
                    const notifSnap = await getDocs(notificacoesRef);

                    notifSnap.forEach((docSnap) => {
                        const data = docSnap.data() as any;
                        if (
                            data?.data &&
                            data?.garg &&
                            data?.ocorrencia &&
                            data?.codigo
                        ) {
                            todas.push({
                                data: data.data,
                                garg: data.garg,
                                ocorrencia: String(data.ocorrencia),
                                codigo: data.codigo,
                                criadoEm: data.criadoEm?.toDate
                                    ? data.criadoEm.toDate()
                                    : new Date(),
                            });
                        }
                    });
                }

                setNotificacoes(todas);
                setAnos(Array.from(anosDetectados).sort());
            } catch (e) {
                console.error("Erro ao carregar dados:", e);
            } finally {
                setLoading(false);
            }
        };

        carregar();
    }, []);

    // Função local, rápida, usando histórico já carregado
    const getValorPorKm = (garg: string, data: Date): number => {
        if (!garg || !data) return 0;
        const lista = garg.startsWith("AS") ? vigAS : vigSW;
        // encontra a primeira vigência cuja dataInicio <= data da notificação
        const vig = lista.find((v) => v.dataInicio <= data);
        return vig ? vig.valorKm : 0;
    };

    // Filtros
    const porAno = useMemo(() => {
        if (!anoSel) return [];
        return notificacoes.filter(
            (n) => n.data.split("/")[2] === anoSel
        );
    }, [anoSel, notificacoes]);

    const porMes = useMemo(() => {
        if (mesSel === null) return [];
        return porAno.filter(
            (n) => parseInt(n.data.split("/")[1], 10) === mesSel + 1
        );
    }, [mesSel, porAno]);

    const porGarg = useMemo(() => {
        if (!gargSel) return [];
        return porMes.filter((n) => n.garg === gargSel);
    }, [gargSel, porMes]);

    // Totais por mês (para o gráfico anual)
    const totalPorMes = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) =>
            porAno.filter(
                (n) => parseInt(n.data.split("/")[1], 10) === i + 1
            ).length
        );
    }, [porAno]);

    // Mapas por garagem (quantidade, km, financeiro)
    const { mapaGarg, mapaKm, mapaFinanceiro } = useMemo(() => {
        const mg: Record<string, number> = {};
        const mk: Record<string, number> = {};
        const mf: Record<string, number> = {};

        for (const n of porMes) {
            const km = getKmDaOcorrencia(n.ocorrencia);
            mg[n.garg] = (mg[n.garg] || 0) + 1;
            mk[n.garg] = (mk[n.garg] || 0) + km;

            const valorKm = getValorPorKm(n.garg, n.criadoEm);
            mf[n.garg] = (mf[n.garg] || 0) + km * valorKm;
        }

        return { mapaGarg: mg, mapaKm: mk, mapaFinanceiro: mf };
    }, [porMes, vigAS, vigSW]);

    const gargKeysOrdenadas = ordemGarg.filter((g) => g in mapaGarg);
    const gargValuesOrdenados = gargKeysOrdenadas.map(
        (g) => mapaGarg[g] || 0
    );
    const gargKmOrdenado = gargKeysOrdenadas.map(
        (g) => mapaKm[g] || 0
    );
    const gargFinanceiroOrdenado = gargKeysOrdenadas.map(
        (g) => mapaFinanceiro[g] || 0
    );

    const estiloGrafico = {
        maxHeight: 320,
        maxWidth: 620,
        overflow: "auto",
    };

    if (loading) {
        return (
            <div
                className="d-flex justify-content-center align-items-center"
                style={{ height: "100vh" }}
            >
                <Spinner animation="border" />
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <h2>📊 Relatório de Notificações Anual</h2>

            <div className="mb-3">
                <label>
                    <strong>Ano:</strong>
                </label>
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
                    {anos.map((a) => (
                        <option key={a} value={a}>
                            {a}
                        </option>
                    ))}
                </select>
            </div>

            {anoSel && (
                <div className="mb-4">
                    <h5>Notificações em {anoSel}</h5>
                    <div style={estiloGrafico}>
                        <Bar
                            data={{
                                labels: mesesLabel,
                                datasets: [
                                    {
                                        label: "Notificações/mês",
                                        data: totalPorMes,
                                        backgroundColor: "#17a2b8",
                                    },
                                ],
                            }}
                            options={{
                                onClick: (_, elems) => {
                                    if (elems.length)
                                        setMesSel(elems[0].index);
                                },
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
                        <h5>
                            🔢 Quantidade por Garagem em{" "}
                            {mesesLabel[mesSel]}
                        </h5>
                        <div style={estiloGrafico}>
                            <Bar
                                data={{
                                    labels: gargKeysOrdenadas,
                                    datasets: [
                                        {
                                            label: "Qtde Notificações",
                                            data: gargValuesOrdenados,
                                            backgroundColor: "#ffc107",
                                        },
                                    ],
                                }}
                                options={{
                                    onClick: (_, elems) => {
                                        if (elems.length)
                                            setGargSel(
                                                gargKeysOrdenadas[
                                                elems[0].index
                                                ]
                                            );
                                    },
                                    responsive: true,
                                    maintainAspectRatio: false,
                                }}
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <h5>
                            <img
                                height={22}
                                src={IconOdometro}
                                alt="icon odometro quilometragem"
                            />{" "}
                            Total KM por Garagem
                        </h5>
                        <div style={estiloGrafico}>
                            <Bar
                                data={{
                                    labels: gargKeysOrdenadas,
                                    datasets: [
                                        {
                                            label: "Total KM",
                                            data: gargKmOrdenado,
                                            backgroundColor:
                                                "rgba(0,123,255,0.7)",
                                        },
                                    ],
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    onClick: (_, elems) => {
                                        if (elems.length)
                                            setGargSel(
                                                gargKeysOrdenadas[
                                                elems[0].index
                                                ]
                                            );
                                    },
                                }}
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <h5>💰 Total Penalização por Garagem (R$)</h5>
                        <div style={estiloGrafico}>
                            <Bar
                                data={{
                                    labels: gargKeysOrdenadas,
                                    datasets: [
                                        {
                                            label: "R$",
                                            data: gargFinanceiroOrdenado.map(
                                                (v) => Math.round(v)
                                            ),
                                            backgroundColor:
                                                "rgba(40,167,69,0.7)",
                                        },
                                    ],
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    onClick: (_, elems) => {
                                        if (elems.length)
                                            setGargSel(
                                                gargKeysOrdenadas[
                                                elems[0].index
                                                ]
                                            );
                                    },
                                    plugins: {
                                        datalabels: {
                                            anchor: "end",
                                            align: "top",
                                            color: "#000",
                                            font: { weight: "bold" },
                                            formatter: (value: number) =>
                                                `R$ ${value.toLocaleString(
                                                    "pt-BR"
                                                )}`,
                                        },
                                    },
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
                        {(() => {
                            const ocorrenciasMap: Record<
                                string,
                                { km: number; valor: number }
                            > = {};

                            porGarg.forEach((n) => {
                                const km = getKmDaOcorrencia(
                                    n.ocorrencia
                                );
                                const valorKm = getValorPorKm(
                                    n.garg,
                                    n.criadoEm
                                );
                                const valor = km * valorKm;

                                if (!ocorrenciasMap[n.ocorrencia]) {
                                    ocorrenciasMap[n.ocorrencia] = {
                                        km,
                                        valor,
                                    };
                                } else {
                                    ocorrenciasMap[n.ocorrencia].km += km;
                                    ocorrenciasMap[n.ocorrencia].valor +=
                                        valor;
                                }
                            });

                            const labels = Object.keys(ocorrenciasMap);
                            const kmData = labels.map(
                                (l) => ocorrenciasMap[l].km
                            );
                            const valorData = labels.map(
                                (l) => ocorrenciasMap[l].valor
                            );
                            const cores = labels.map(
                                (_, i) =>
                                    `hsl(${(i * 60) % 360}, 70%, 60%)`
                            );

                            const totalKm = kmData.reduce(
                                (acc, v) => acc + v,
                                0
                            );
                            const totalValor = valorData.reduce(
                                (acc, v) => acc + v,
                                0
                            );

                            return (
                                <>
                                    <div
                                        style={{
                                            width: 300,
                                            height: 350,
                                        }}
                                    >
                                        <h6>Quilometragem (KM)</h6>
                                        <Chart
                                            type="pie"
                                            data={{
                                                labels,
                                                datasets: [
                                                    {
                                                        label: "KM",
                                                        data: kmData,
                                                        backgroundColor:
                                                            cores,
                                                    },
                                                ],
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                            }}
                                        />
                                        <div className="mt-2 text-center">
                                            <strong>Total:</strong>{" "}
                                            {totalKm.toLocaleString(
                                                "pt-BR"
                                            )}{" "}
                                            km
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            width: 300,
                                            height: 350,
                                        }}
                                    >
                                        <h6>Financeiro (R$)</h6>
                                        <Chart
                                            type="pie"
                                            data={{
                                                labels,
                                                datasets: [
                                                    {
                                                        label: "R$",
                                                        data: valorData,
                                                        backgroundColor:
                                                            cores,
                                                    },
                                                ],
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    datalabels: {
                                                        formatter: (
                                                            value
                                                        ) =>
                                                            `R$ ${Math.floor(
                                                                value
                                                            ).toLocaleString(
                                                                "pt-BR"
                                                            )}`,
                                                        color: "#fff",
                                                        font: {
                                                            weight:
                                                                "bold",
                                                            size: 14,
                                                        },
                                                    },
                                                },
                                            }}
                                            plugins={[ChartDataLabels]}
                                        />
                                        <div className="mt-2 text-center">
                                            <strong>Total:</strong> R{" "}
                                            {totalValor.toLocaleString(
                                                "pt-BR",
                                                {
                                                    minimumFractionDigits: 2,
                                                }
                                            )}
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
