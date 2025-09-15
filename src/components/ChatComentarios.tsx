import { useEffect, useState } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, doc, updateDoc, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig"; // caminho correto
import { useUser } from "../contexts/UserContext"; // hook correto

interface Comentario {
    id: string;
    autorId: string;
    autorNome: string;
    mensagem: string;
    criadoEm: Timestamp;
    adicionarComentario: (novoComentario: Comentario) => void;
}

interface Props {
    grupo: string;
    codigo: string;
    onClose: () => void;
    setNotificacoes: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function ChatComentarios({ grupo, codigo, onClose, setNotificacoes }: Props) {
    const [mensagem, setMensagem] = useState("");
    const [comentarios, setComentarios] = useState<Comentario[]>([]); // Tipando os comentários
    const [editandoComentario, setEditandoComentario] = useState<Comentario | null>(null); // Para editar um comentário
    const { user } = useUser(); // pega uid e displayName

    useEffect(() => {
        const comentariosRef = collection(db, "notificacoes", grupo, "notificacoes", codigo, "comentarios");
        const q = query(comentariosRef, orderBy("criadoEm", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setComentarios(lista);
        });

        return () => unsubscribe();
    }, [grupo, codigo]);

    // Função para enviar o comentário ou atualizar
    const enviarComentario = async () => {
        if (!mensagem.trim() || !user?.uid) return;

        const comentariosRef = collection(db, "notificacoes", grupo, "notificacoes", codigo, "comentarios");

        try {
            if (editandoComentario) {
                // Atualiza comentário existente
                const comentarioRef = doc(comentariosRef, editandoComentario.id);
                await updateDoc(comentarioRef, {
                    mensagem,
                    autorId: user.uid,
                    autorNome: user.displayName || user.email,
                    criadoEm: Timestamp.now()
                });
            } else {
                // Adiciona novo comentário
                await addDoc(comentariosRef, {
                    autorId: user.uid,
                    autorNome: user.displayName || user.email,
                    mensagem,
                    criadoEm: Timestamp.now()
                });
            }

            // Limpa campos
            setMensagem("");
            setEditandoComentario(null);

            // Recarrega os comentários atualizados
            const snapshot = await getDocs(comentariosRef);
            const comentariosData = snapshot.docs.map(doc => ({
                id: doc.id,
                autorNome: doc.data().autorNome,
                mensagem: doc.data().mensagem,
            }));

            const qtdComentarios = comentariosData.length;

            // Atualiza o estado de notificações no componente pai
            setNotificacoes((prevNotificacoes) =>
                prevNotificacoes.map((notificacao) =>
                    notificacao.codigo === codigo
                        ? {
                            ...notificacao,
                            comentarios: comentariosData,
                            qtdComentarios
                        }
                        : notificacao
                )
            );
        } catch (error) {
            console.error("Erro ao enviar ou atualizar comentário:", error);
        }
    };

    // Função para iniciar a edição de um comentário
    const editarComentario = (comentario: Comentario) => {
        setMensagem(comentario.mensagem); // Preenche o campo de mensagem com o comentário a ser editado
        setEditandoComentario(comentario); // Marca como comentário em edição
    };

    return (
        <div className="chat-popup border rounded p-3 bg-light mt-3" style={{ width: "100%", maxHeight: "400px", overflowY: "auto", zIndex: 1 }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
                <strong>Comentários:</strong>
                {/* <button className="btn btn-sm btn-danger" onClick={onClose}>Fechar</button> */}
            </div>
            <div className="mb-2">
                {comentarios.map((c) => (
                    <div key={c.id} className="mb-1 d-flex justify-content-between">
                        <div>
                            <strong>{c.autorNome}:</strong> {c.mensagem}
                        </div>
                        {/* <button
                            className="btn btn-sm btn-warning"
                            onClick={() => editarComentario(c)} // Botão para editar comentário
                        >
                            Editar
                        </button> */}
                    </div>
                ))}
            </div>
            <div className="d-flex">
                <input
                    type="text"
                    className="form-control me-2"
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Digite um comentário..."
                />
                <button className="btn btn-primary" onClick={enviarComentario}>
                    {editandoComentario ? "Atualizar" : "Enviar"}  {/* Muda o texto do botão dependendo se está editando ou não */}
                </button>
            </div>
        </div>
    );
}