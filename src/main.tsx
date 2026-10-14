import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { configOk } from "./lib/supabase";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {configOk ? (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    ) : (
      <div className="center-screen">
        <div className="card narrow center">
          <h2>Configuração pendente</h2>
          <p className="muted">
            Faltam as variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> neste deploy.
            Adicione-as nas configurações do projeto e faça um novo deploy.
          </p>
        </div>
      </div>
    )}
  </StrictMode>,
);
