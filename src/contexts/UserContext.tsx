import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

// Interface de usuário
interface User {
  email: string | null;
  uid: string | null;
  displayName: string | null;
  setor: string | null;
  funcao?: string | null;
}

// Interface do contexto
interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
  loading: boolean;
}

// Cria o contexto
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
        const docRef = doc(db, "clientes", firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        const data = docSnap.exists() ? docSnap.data() : {};

        const nomeCliente = data.nome ?? firebaseUser.displayName ?? firebaseUser.email;
        const setorCliente = data.setor ?? null;
        const funcaoCliente = data.funcao ?? null;

        setUser({
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          displayName: nomeCliente,
          setor: setorCliente,
          funcao: funcaoCliente,
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

// Hook personalizado
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser deve ser usado dentro de um UserProvider');
  return context;
};