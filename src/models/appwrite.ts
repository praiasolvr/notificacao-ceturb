import { Client, Account, ID } from 'appwrite';

// Checagem de variáveis de ambiente
if (!import.meta.env.VITE_APPWRITE_PROJECT_ID || !import.meta.env.VITE_APPWRITE_ENDPOINT) {
    throw new Error('VITE_APPWRITE_PROJECT_ID e VITE_APPWRITE_ENDPOINT devem estar definidos no .env.local');
}

const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;

// Inicializa o cliente Appwrite
export const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT) // URL da API
    .setProject(APPWRITE_PROJECT_ID); // ID do projeto

// Exporta objetos prontos para uso
export const account = new Account(client);
export { ID };