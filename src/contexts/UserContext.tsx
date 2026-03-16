import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

interface User {
  email: string | null;
  uid: string | null;
  displayName: string | null;
  setor: string | null;
  funcao: string | null;
}

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const ref = doc(db, "clientes", firebaseUser.uid);
        let snap = await getDoc(ref);

        // 🔥 Tenta até 5 vezes caso o documento ainda não tenha sido criado
        let tentativas = 0;
        while (!snap.exists() && tentativas < 5) {
          await new Promise(res => setTimeout(res, 300));
          snap = await getDoc(ref);
          tentativas++;
        }

        const data = snap.exists() ? snap.data() : {};

        setUser({
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          displayName: data.nome ?? firebaseUser.displayName ?? firebaseUser.email,
          setor: data.setor ? data.setor.toLowerCase() : null,
          funcao: data.funcao ?? null,
        });

      } catch (err) {
        console.error("Erro ao buscar dados do cliente:", err);

        setUser({
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName ?? firebaseUser.email,
          setor: null,
          funcao: null,
        });
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser deve ser usado dentro de um UserProvider');
  return context;
};
