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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true); // sempre ativa o loading antes de atualizar

      if (firebaseUser) {
        try {
          // Busca dados do Firestore
          const docRef = doc(db, 'clientes', firebaseUser.uid);
          const docSnap = await getDoc(docRef);

          let nomeCliente: string | null = null;
          let setorCliente: string | null = null;

          if (docSnap.exists()) {
            const data = docSnap.data();
            nomeCliente = data.nome ?? null;
            setorCliente = data.setor ?? null;
          }

          // 🔸 Espera o Firestore antes de atualizar o estado
          setUser({
            email: firebaseUser.email,
            uid: firebaseUser.uid,
            displayName: nomeCliente ?? firebaseUser.displayName ?? firebaseUser.email,
            setor: setorCliente,
          });
        } catch (error) {
          console.error('Erro ao buscar dados do cliente:', error);
          setUser({
            email: firebaseUser.email,
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName ?? firebaseUser.email,
            setor: null,
          });
        }
      } else {
        setUser(null);
      }

      // 🔸 Somente depois de tudo, desativa o loading
      setLoading(false);
    });

    return unsubscribe;
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