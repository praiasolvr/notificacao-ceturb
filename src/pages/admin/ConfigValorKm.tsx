import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, orderBy, query } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const consorcios = [
    { id: "atlanticoSul", nome: "Atlântico Sul" },
    { id: "sudoeste", nome: "Sudoeste" },
];

interface Vigencia {
    id: string;
    dataInicio: string; // YYYY-MM-DD
    valorKm: number;
}

const ConfigValorKm: React.FC = () => {
    const [consorcioSel, setConsorcioSel] = useState<string>("atlanticoSul");
    const [vigencias, setVigencias] = useState<Vigencia[]>([]);
    const [dataInicio, setDataInicio] = useState("");
    const [valorKm, setValorKm] = useState("");
    const [editando, setEditando] = useState<Vigencia | null>(null);
    const [carregando, setCarregando] = useState(false);

    const carregarVigencias = async () => {
        setCarregando(true);
        try {
            const ref = collection(db, "valorKm", consorcioSel, "historico");
            const q = query(ref, orderBy("dataInicio", "desc"));
            const snap = await getDocs(q);

            const lista: Vigencia[] = snap.docs.map((d) => ({
                id: d.id,
                dataInicio: d.data().dataInicio,
                valorKm: d.data().valorKm,
            }));

            setVigencias(lista);
        } catch (err) {
            console.error("Erro ao carregar vigências:", err);
        }
        setCarregando(false);
    };

    useEffect(() => {
        carregarVigencias();
    }, [consorcioSel]);

    const salvar = async () => {
        if (!dataInicio || !valorKm) return;

        const ref = collection(db, "valorKm", consorcioSel, "historico");

        try {
            if (editando) {
                const docRef = doc(db, "valorKm", consorcioSel, "historico", editando.id);
                await updateDoc(docRef, {
                    dataInicio,
                    valorKm: Number(valorKm),
                });
            } else {
                await addDoc(ref, {
                    dataInicio,
                    valorKm: Number(valorKm),
                });
            }

            setDataInicio("");
            setValorKm("");
            setEditando(null);
            carregarVigencias();
        } catch (err) {
            console.error("Erro ao salvar vigência:", err);
        }
    };

    const excluir = async (id: string) => {
        if (!window.confirm("Deseja realmente excluir esta vigência?")) return;

        try {
            const docRef = doc(db, "valorKm", consorcioSel, "historico", id);
            await deleteDoc(docRef);
            carregarVigencias();
        } catch (err) {
            console.error("Erro ao excluir vigência:", err);
        }
    };

    const iniciarEdicao = (v: Vigencia) => {
        setEditando(v);
        setDataInicio(v.dataInicio);
        setValorKm(String(v.valorKm));
    };

    return (
        <div className="container mt-4">
            <h2>⚙️ Configuração — Valor por KM</h2>

            <div className="mb-3">
                <label><strong>Consórcio:</strong></label>
                <select
                    className="form-control"
                    value={consorcioSel}
                    onChange={(e) => setConsorcioSel(e.target.value)}
                >
                    {consorcios.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                </select>
            </div>

            <div className="card p-3 mb-4">
                <h5>{editando ? "Editar Vigência" : "Nova Vigência"}</h5>

                <div className="row">
                    <div className="col-md-4">
                        <label>Data de Início</label>
                        <input
                            type="date"
                            className="form-control"
                            value={dataInicio}
                            onChange={(e) => setDataInicio(e.target.value)}
                        />
                    </div>

                    <div className="col-md-4">
                        <label>Valor por KM (R$)</label>
                        <input
                            type="number"
                            step="0.0001"
                            className="form-control"
                            value={valorKm}
                            onChange={(e) => setValorKm(e.target.value)}
                        />
                    </div>

                    <div className="col-md-4 d-flex align-items-end">
                        <button className="btn btn-primary w-100" onClick={salvar}>
                            {editando ? "Salvar Alterações" : "Adicionar"}
                        </button>
                    </div>
                </div>
            </div>

            <h4>📅 Histórico de Vigências</h4>

            {carregando ? (
                <p>Carregando...</p>
            ) : (
                <table className="table table-striped mt-3">
                    <thead>
                        <tr>
                            <th>Data Início</th>
                            <th>Valor por KM</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vigencias.map((v) => (
                            <tr key={v.id}>
                                <td>{v.dataInicio}</td>
                                <td>R$ {v.valorKm.toFixed(4)}</td>
                                <td>
                                    <button className="btn btn-sm btn-warning me-2" onClick={() => iniciarEdicao(v)}>
                                        Editar
                                    </button>
                                    <button className="btn btn-sm btn-danger" onClick={() => excluir(v.id)}>
                                        Excluir
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {vigencias.length === 0 && (
                            <tr>
                                <td colSpan={3} className="text-center">Nenhuma vigência cadastrada.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ConfigValorKm;
