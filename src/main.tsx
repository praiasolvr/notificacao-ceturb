import 'bootstrap/dist/css/bootstrap.min.css';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import { NotificacoesProvider } from './contexts/NotificacoesContext';

createRoot(document.getElementById('root')!).render(
  <UserProvider>
    <NotificacoesProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </NotificacoesProvider>
  </UserProvider>
);
