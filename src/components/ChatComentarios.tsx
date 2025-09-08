import { useEffect, useState } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig"; // caminho correto
import { useUser } from "../contexts/UserContext"; // hook correto

interface Props {
    grupo: string;
    codigo: string;
    onClose: () => void;
}

export default function ChatComentarios({ grupo, codigo, onClose }: Props) {
    const [mensagem, setMensagem] = useState("");
    const [comentarios, setComentarios] = useState<any[]>([]);
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

    const enviarComentario = async () => {
        if (!mensagem.trim() || !user?.uid) return;

        const comentariosRef = collection(db, "notificacoes", grupo, "notificacoes", codigo, "comentarios");
        await addDoc(comentariosRef, {
            autorId: user.uid,
            autorNome: user.displayName || user.email,
            mensagem,
            criadoEm: Timestamp.now()
        });

        setMensagem("");
    };

    return (
        <div className="chat-popup border rounded p-3 bg-light position-fixed bottom-0 end-0 m-3" style={{ width: "350px", maxHeight: "400px", overflowY: "auto", zIndex: 9999 }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
                <strong>Comentários — {codigo}</strong>
                <button className="btn btn-sm btn-danger" onClick={onClose}>Fechar</button>
            </div>
            <div className="mb-2">
                {comentarios.map((c) => (
                    <div key={c.id} className="mb-1">
                        <strong>{c.autorNome}:</strong> {c.mensagem}
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
                <button className="btn btn-primary" onClick={enviarComentario}>Enviar</button>
            </div>
        </div>
    );
}