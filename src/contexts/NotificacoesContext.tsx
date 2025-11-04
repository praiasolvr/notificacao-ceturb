// contexts/NotificacoesContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

interface Notificacao {
    codigo: string;
    data: string;
    garg: string;
}

interface NotificacoesContextType {
    notificacoes: Notificacao[];
    loading: boolean;
    atualizar: () => Promise<void>;
}

const NotificacoesContext = createContext<NotificacoesContextType>({
    notificacoes: [],
    loading: true,
    atualizar: async () => { },
});

export const useNotificacoes = () => useContext(NotificacoesContext);

export const NotificacoesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<string | null>(null);

    async function carregarNotificacoes() {
        setLoading(true);

        const timestampDoc = await getDoc(doc(db, "metadados", "notificacoes"));
        const remoteTimestamp = timestampDoc.data()?.lastUpdated;

        if (remoteTimestamp === lastUpdate && notificacoes.length > 0) {
            setLoading(false);
            return;
        }

        const gruposSnap = await getDocs(collection(db, "notificacoes"));
        const grupos = gruposSnap.docs.map(doc => doc.id);

        const todas: Notificacao[] = [];

        for (const grupo of grupos) {
            const ref = collection(db, "notificacoes", grupo, "notificacoes");
            const snap = await getDocs(ref);

            for (const doc of snap.docs) {
                const data = doc.data();
                if (data?.data && data?.garg && data?.codigo) {
                    todas.push({
                        data: data.data,
                        garg: data.garg,
                        codigo: data.codigo,
                    });
                }
            }
        }

        setNotificacoes(todas);
        setLastUpdate(remoteTimestamp);
        setLoading(false);
    }

    useEffect(() => {
        carregarNotificacoes();
    }, []);

    return (
        <NotificacoesContext.Provider value={{ notificacoes, loading, atualizar: carregarNotificacoes }}>
            {children}
        </NotificacoesContext.Provider>
    );
};