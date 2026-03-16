import Swal from 'sweetalert2';
import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { colorAzul, colorBranco } from '../../values/colors';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [nome, setNome] = useState('');
  const [setor, setSetor] = useState('');
  const [funcao, setFuncao] = useState('');
  const [manterSessao, setManterSessao] = useState(true);

  const { setUser } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleToggle = () => setIsLogin(!isLogin);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      // 🔥 Garante que a persistência será aplicada corretamente
      await signOut(auth);

      await setPersistence(
        auth,
        manterSessao ? browserLocalPersistence : browserSessionPersistence
      );

      if (isLogin) {
        // LOGIN
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        const uid = userCredential.user.uid;

        const snap = await getDoc(doc(db, "clientes", uid));
        const dados = snap.exists() ? snap.data() : {};

        setUser({
          email: userCredential.user.email,
          uid,
          displayName: dados.nome || userCredential.user.displayName || "",
          setor: dados.setor?.toLowerCase() || "",
          funcao: dados.funcao || "",
        });

        Swal.fire({ title: 'Bem-vindo!', icon: 'success' });
        navigate('/dashboard');

      } else {
        // CADASTRO
        if (senha !== confirmarSenha) {
          Swal.fire({ icon: 'error', title: 'Erro', text: 'As senhas não coincidem.' });
          setLoading(false);
          return;
        }

        if (!nome) {
          Swal.fire({ icon: 'error', title: 'Erro', text: 'Nome obrigatório.' });
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, 'clientes', uid), {
          nome,
          email,
          setor: setor.toLowerCase(),
          funcao,
          criadoEm: new Date(),
        });

        setUser({
          email,
          uid,
          displayName: nome,
          setor: setor.toLowerCase(),
          funcao,
        });

        Swal.fire({ title: 'Cadastro realizado!', icon: 'success' });
        navigate('/dashboard');
      }
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Erro', text: 'Falha na autenticação.' });
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#EAF0F6',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '600px',
      }}>
        <h2 style={{ color: colorAzul, marginBottom: '10px', textAlign: 'center' }}>
          {isLogin ? 'Entrar' : 'Criar conta'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className='mb-3'>
            <label className='form-label'>E-mail</label>
            <input type='email' className='form-control' value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className='mb-3'>
            <label className='form-label'>Senha</label>
            <input type='password' className='form-control' value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </div>

          {/* 🔥 Checkbox "Manter sessão" */}
          <div className='mb-3'>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={manterSessao}
                onChange={() => setManterSessao(!manterSessao)}
              />
              Manter sessão
            </label>
          </div>

          {!isLogin && (
            <>
              <div className='mb-3'>
                <label className='form-label'>Confirme sua senha</label>
                <input type='password' className='form-control' value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} required />
              </div>

              <div className='mb-3'>
                <label className='form-label'>Seu nome</label>
                <input type='text' className='form-control' value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>

              <div className='mb-3'>
                <label className='form-label'>Setor</label>
                <input type='text' className='form-control' value={setor} onChange={(e) => setSetor(e.target.value)} required />
              </div>

              <div className='mb-3'>
                <label className='form-label'>Função</label>
                <input type='text' className='form-control' value={funcao} onChange={(e) => setFuncao(e.target.value)} required />
              </div>
            </>
          )}

          <button type='submit' className='btn w-100' disabled={loading}
            style={{ backgroundColor: colorAzul, color: colorBranco }}>
            {loading ? "Carregando..." : isLogin ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center' }}>
          <span>{isLogin ? 'Não tem uma conta?' : 'Já possui uma conta?'}</span>
          <br />
          <button onClick={handleToggle} style={{ background: 'transparent', border: 'none', color: colorAzul }}>
            {isLogin ? 'Cadastre-se' : 'Fazer login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
