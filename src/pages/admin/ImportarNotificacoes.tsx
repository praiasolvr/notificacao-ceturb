// Importações principais
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
    getDocs,
    collection,
    doc,
    updateDoc,
    getDoc,
    DocumentData,
    serverTimestamp,
    setDoc,
    addDoc
} from "firebase/firestore";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { db } from "../../firebaseConfig";
import { format, parseISO, differenceInYears, differenceInMonths, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import { Motivo } from "../../types/Motivo";


import Papa from 'papaparse';

const ImportarNotificacoes: React.FC = () => {
    const [usuarios, setUsuarios] = useState<{ id: string; nome: string; email: string }[]>([]);
    const [solicitacoes, setSolicitacoes] = useState<{ [key: string]: Solicitacao[] }>({});
    const [carregando, setCarregando] = useState<boolean>(true);
    const [usuariosExpandido, setUsuariosExpandido] = useState<{ [key: string]: boolean }>({});
    const [filtroSituacao, setFiltroSituacao] = useState<string>("todos");
    const [filtroNome, setFiltroNome] = useState<string>("");
    const [_contagemStatus, setContagemStatus] = useState({ pendente: 0, finalizado: 0 });
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [motivosMap, setMotivosMap] = useState<Map<string, Motivo>>(new Map());



    // const [fileName, setFileName] = useState('');

    interface Solicitacao {
        id: string;
        situacao: "pendente" | "finalizado";
        veiculo?: string;
        motivo?: Motivo;
        descricao?: string;
        dataInicio?: string;
        dataFim?: string;
        horaFinalizacao?: {
            seconds: number;
            nanoseconds: number;
        };
        temImagem?: boolean;
        resolvido?: boolean;
        observacao?: string;
        criadoEm?: {
            seconds: number;
            nanoseconds: number;
        };
    }

    useEffect(() => {
        fetchMotivos();
        fetchUsuarios();

        const verificarTamanhoTela = () => {
            setIsMobile(window.innerWidth < 768);
        };

        verificarTamanhoTela();
        window.addEventListener("resize", verificarTamanhoTela);
        return () => window.removeEventListener("resize", verificarTamanhoTela);
    }, []);

    const fetchMotivos = async () => {
        const motivosSnapshot = await getDocs(collection(db, "motivo"));
        const map = new Map<string, Motivo>();

        motivosSnapshot.forEach((doc) => {
            const data = doc.data();
            map.set(doc.id, { id: doc.id, nome: data.nome });
        });

        setMotivosMap(map);
    };

    useEffect(() => {
        if (usuarios.length > 0 && motivosMap.size > 0) {
            fetchTodasSolicitacoes(usuarios);
        }
    }, [usuarios, filtroSituacao, motivosMap]);

    useEffect(() => {
        if (usuarios.length > 0) {
            fetchTodasSolicitacoes(usuarios);
        }
    }, [filtroSituacao]);

    const fetchUsuarios = async () => {
        setCarregando(true);
        try {
            const usuariosSnapshot = await getDocs(collection(db, "solicitacoes"));
            if (usuariosSnapshot.empty) {
                setUsuarios([]);
            } else {
                const listaUsuarios = await Promise.all(
                    usuariosSnapshot.docs.map(async (documento) => {
                        const userId = documento.id;
                        const clienteRef = doc(db, "clientes", userId);
                        const clienteSnapshot = await getDoc(clienteRef);
                        const clienteData = clienteSnapshot.data() as DocumentData;

                        return {
                            id: userId,
                            nome: clienteSnapshot.exists() ? clienteData.nome : "Nome desconhecido",
                            email: clienteSnapshot.exists() ? clienteData.email : "Email desconhecido"
                        };
                    })
                );
                setUsuarios(listaUsuarios);
            }
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
        } finally {
            setCarregando(false);
        }
    };

    const fetchTodasSolicitacoes = async (usuariosLista: { id: string }[]) => {
        let pendentes = 0;
        let finalizados = 0;
        const todasSolicitacoes: { [key: string]: Solicitacao[] } = {};

        for (const usuario of usuariosLista) {
            const solicitacoesRef = collection(db, `solicitacoes/${usuario.id}/lista_solicitacoes`);
            const snapshot = await getDocs(solicitacoesRef);

            const listaSolicitacoes = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const motivoId = data.motivo;
                const motivo = motivosMap.get(motivoId);

                const solicitacao: Solicitacao = {
                    id: docSnap.id,
                    ...data,
                    situacao: data.situacao || "pendente", // garantir que exista 'situacao'
                    motivo: motivo || { id: motivoId, nome: "Motivo desconhecido" }
                };

                if (solicitacao.situacao === "pendente") pendentes++;
                if (solicitacao.situacao === "finalizado") finalizados++;

                return solicitacao;
            });

            todasSolicitacoes[usuario.id] = listaSolicitacoes;
        }

        setSolicitacoes(todasSolicitacoes);
        setContagemStatus({ pendente: pendentes, finalizado: finalizados });
    };

    const toggleExpandir = (usuarioId: string) => {
        setUsuariosExpandido(prev => ({
            ...prev,
            [usuarioId]: !prev[usuarioId]
        }));
    };

    const confirmarFinalizacao = (usuarioId: string, solicitacaoId: string) => {
        Swal.fire({
            title: "Finalizar Solicitação",
            html: `
                <div style="text-align: left">
                    <label>Tem imagem?</label><br/>
                    <input type="radio" name="temImagem" value="sim" id="temImagemSim" /> Sim
                    <input type="radio" name="temImagem" value="nao" id="temImagemNao" /> Não
                    <br/><br/>

                    <label>Foi resolvido?</label><br/>
                    <input type="radio" name="resolvido" value="sim" id="resolvidoSim" /> Sim
                    <input type="radio" name="resolvido" value="nao" id="resolvidoNao" /> Não
                    <br/><br/>

                    <label for="observacao">Observação/Justificativa:</label><br/>
                    <textarea id="observacao" class="swal2-textarea" placeholder="Digite sua observação (obrigatório se não resolvido)"></textarea>
                </div>
            `,
            didOpen: () => {
                const temImagemSim = document.getElementById("temImagemSim") as HTMLInputElement;
                const temImagemNao = document.getElementById("temImagemNao") as HTMLInputElement;
                const resolvidoSim = document.getElementById("resolvidoSim") as HTMLInputElement;

                const handleImagemChange = () => {
                    if (temImagemNao.checked) {
                        resolvidoSim.disabled = true;
                        resolvidoSim.checked = false;
                        (document.getElementById("resolvidoNao") as HTMLInputElement).checked = true;
                    } else {
                        resolvidoSim.disabled = false;
                    }
                };

                temImagemSim.addEventListener("change", handleImagemChange);
                temImagemNao.addEventListener("change", handleImagemChange);
            },
            showCancelButton: true,
            confirmButtonText: "Sim, finalizar!",
            cancelButtonText: "Cancelar",
            preConfirm: () => {
                const temImagem = (document.querySelector('input[name="temImagem"]:checked') as HTMLInputElement)?.value;
                const resolvido = (document.querySelector('input[name="resolvido"]:checked') as HTMLInputElement)?.value;
                const observacao = (document.getElementById("observacao") as HTMLTextAreaElement)?.value.trim();

                if (!temImagem || !resolvido) {
                    Swal.showValidationMessage("Por favor, responda se há imagem e se foi resolvido.");
                    return;
                }

                if (temImagem === "nao" && resolvido === "sim") {
                    Swal.showValidationMessage("Não é permitido marcar como resolvido se não há imagem.");
                    return;
                }

                if (resolvido === "nao" && !observacao) {
                    Swal.showValidationMessage("Justificativa é obrigatória se o chamado não foi resolvido.");
                    return;
                }

                return { temImagem, resolvido, observacao };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const { temImagem, resolvido, observacao } = result.value;
                atualizarSituacao(usuarioId, solicitacaoId, {
                    temImagem: temImagem === "sim",
                    resolvido: resolvido === "sim",
                    observacao
                });

                Swal.fire("Finalizado!", "O chamado foi marcado como finalizado.", "success");
            }
        });
    };

    const atualizarSituacao = async (
        usuarioId: string,
        solicitacaoId: string,
        extras?: { temImagem: boolean; resolvido: boolean; observacao: string }
    ) => {
        try {
            const solicitacaoRef = doc(db, `solicitacoes/${usuarioId}/lista_solicitacoes/${solicitacaoId}`);
            await updateDoc(solicitacaoRef, {
                situacao: "finalizado",
                horaFinalizacao: serverTimestamp(),
                ...extras
            });

            fetchUsuarios(); // Recarrega os dados
        } catch (error) {
            console.error(`Erro ao atualizar solicitação ${solicitacaoId}:`, error);
        }
    };

    // Função para calcular o tempo de imagem solicitado
    const calcularTempoImagemSolicitado = (dataInicio?: string, dataFim?: string) => {
        if (!dataInicio || !dataFim) return "Não informado"; // Se qualquer data estiver faltando, retorna "Não informado"

        try {
            const inicio = parseISO(dataInicio);
            const fim = parseISO(dataFim);

            const anos = differenceInYears(fim, inicio);
            const meses = differenceInMonths(fim, inicio) % 12;
            const dias = differenceInDays(fim, inicio) % 30; // Para dias que não completam um mês
            const horas = differenceInHours(fim, inicio) % 24;
            const minutos = differenceInMinutes(fim, inicio) % 60;

            let resultado = "";

            if (anos > 0) resultado += `${anos} ano${anos > 1 ? "s" : ""}, `;
            if (meses > 0) resultado += `${meses} mês${meses > 1 ? "es" : ""}, `;
            if (dias > 0) resultado += `${dias} dia${dias > 1 ? "s" : ""}, `;
            if (horas > 0 || minutos > 0) {
                resultado += `${horas} hora${horas > 1 ? "s" : ""}, ${minutos} minuto${minutos > 1 ? "s" : ""}`;
            }

            // Se a diferença for menor que 1 dia, exibe apenas horas e minutos
            if (dias === 0) {
                resultado = `${horas} hora${horas > 1 ? "s" : ""}, ${minutos} minuto${minutos > 1 ? "s" : ""}`;
            }

            return resultado || "Menos de 1 minuto"; // Caso a diferença seja muito pequena, exibe "Menos de 1 minuto"
        } catch (error) {
            console.error("Erro ao calcular a diferença de tempo:", error);
            return "Erro ao calcular tempo"; // Em caso de erro, retorna uma mensagem de erro
        }
    };

    const [fileContent, setFileContent] = useState('');
    const [fileName, setFileName] = useState('');
    const [tableData, setTableData] = useState([]);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setFileName(file.name);

        const reader = new FileReader();

        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            const decoder = new TextDecoder('iso-8859-1'); // ← Suporte a acentos
            const decodedText = decoder.decode(arrayBuffer);

            Papa.parse(decodedText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setTableData(results.data);
                },
                error: (error) => {
                    console.error("Erro ao processar CSV:", error);
                }
            });
        };

        reader.onerror = (err) => {
            console.error("Erro ao ler o arquivo:", err);
        };

        reader.readAsArrayBuffer(file); // ← Leitura como binário
    };

    const handleImportarArquivo = async () => {
        if (!tableData || tableData.length === 0) {
            Swal.fire("Erro", "Nenhum dado para importar. Por favor, carregue um arquivo válido.", "error");
            return;
        }

        const confirmacao = await Swal.fire({
            title: "Importar notificações?",
            text: "Tem certeza que deseja importar essas notificações para o Firebase?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sim, importar",
            cancelButtonText: "Cancelar"
        });

        if (!confirmacao.isConfirmed) return;

        try {
            for (const item of tableData) {
                const codigo = item["NOTIF."];
                const dataStr = item["DATA"]; // Ex: "11/08/2025"

                if (!codigo || !dataStr) continue;

                const [diaStr, mesStr, anoStr] = dataStr.split("/");
                const dia = parseInt(diaStr, 10);
                const mes = mesStr.padStart(2, "0");
                const ano = anoStr;

                const decendio = obterDecendio(dia);
                const caminho = `${ano}_${mes}_${decendio}`;

                // 🔒 Garante que o documento do decêndio existe
                const decendioRef = doc(db, "notificacoes", caminho);
                await setDoc(decendioRef, { criadoEm: serverTimestamp() }, { merge: true });

                // ✅ Salva os dados diretamente no documento do código
                const codigoRef = doc(db, `notificacoes/${caminho}/notificacoes/${codigo}`);
                await setDoc(codigoRef, {
                    criadoEm: serverTimestamp(),
                    atualizadoEm: serverTimestamp(),
                    codigo,
                    multa: item["MULTA"],
                    garg: item["GARG"],
                    carro: item["CARRO"],
                    linha: item["LINHA"],
                    data: dataStr,
                    hora: item["HORA"],
                    agente: item["AGENTE"],
                    ocorrencia: item["OCOR."],
                    local: item["CÓDIGO E LOCAL"],
                    observacoes: item["OUTRAS OBSERVAÇÕES :"] || ""
                }, { merge: true });
            }

            Swal.fire("Sucesso", "Notificações importadas com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao importar notificações:", error);
            Swal.fire("Erro", "Houve um problema ao importar. Veja o console para mais detalhes.", "error");
        }
    };

    const obterDecendio = (dia: number): string => {
        if (dia <= 10) return "decendio1";
        if (dia <= 20) return "decendio2";
        return "decendio3";
    };




    const [resumoImportacao, setResumoImportacao] = useState<{
        total: number;
        porEmpresa: Record<string, number>;
        periodo: string;
    }>({ total: 0, porEmpresa: {}, periodo: '' });

    useEffect(() => {
        if (tableData.length === 0) {
            setResumoImportacao({ total: 0, porEmpresa: {}, periodo: '' });
            return;
        }

        const contagem: Record<string, number> = {};
        let datas: Date[] = [];

        for (const item of tableData) {
            const empresa = item["GARG"] || "Desconhecida";
            contagem[empresa] = (contagem[empresa] || 0) + 1;

            const dataStr = item["DATA"];
            if (dataStr) {
                const [dia, mes, ano] = dataStr.split('/');
                if (dia && mes && ano) {
                    const data = new Date(`${ano}-${mes}-${dia}`);
                    if (!isNaN(data.getTime())) {
                        datas.push(data);
                    }
                }
            }
        }

        const total = tableData.length;

        datas.sort((a, b) => a.getTime() - b.getTime());
        const dataInicio = datas[0];
        const dataFim = datas[datas.length - 1];
        const periodo = dataInicio && dataFim
            ? `De ${format(dataInicio, 'dd/MM/yyyy')} até ${format(dataFim, 'dd/MM/yyyy')}`
            : 'Período desconhecido';

        setResumoImportacao({ total, porEmpresa: contagem, periodo });
    }, [tableData]);




    return (
        <div className="container mt-4">
            <h2>Importar Notificações</h2>

            <div style={{ padding: 20 }}>
                <input
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileChange}
                />
                {fileName && <p><strong>Arquivo selecionado:</strong> {fileName}</p>}

                {tableData.length > 0 && (
                    <div>
                        <h2>Conteúdo do arquivo:</h2>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#ddd' }}>
                                        {Object.keys(tableData[0]).map((header, idx) => (
                                            <th key={idx} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData.map((row, rowIdx) => (
                                        <tr key={rowIdx}>
                                            {Object.values(row).map((cell, cellIdx) => (
                                                <td key={cellIdx} style={{ border: '1px solid #ccc', padding: '8px' }}>
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>



            {resumoImportacao.total > 0 && (
                <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '6px' }}>
                    <h4>Resumo da Importação:</h4>
                    <p><strong>Total de notificações:</strong> {resumoImportacao.total}</p>
                    <p><strong>Período:</strong> {resumoImportacao.periodo}</p>
                    <h5>Notificações por empresa:</h5>
                    <ul>
                        {Object.entries(resumoImportacao.porEmpresa).map(([empresa, qtd]) => (
                            <li key={empresa}><strong>{empresa}:</strong> {qtd}</li>
                        ))}
                    </ul>
                </div>
            )}


            {fileName && (
                <button onClick={handleImportarArquivo}>Confirmar Importação</button>
            )}


        </div>
    );
};

export default ImportarNotificacoes;