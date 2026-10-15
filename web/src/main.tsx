import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/base.css";
import "./styles/shell.css";
import "./styles/pages.css";
import "./styles/games.css";
import "./styles/spirits.css";
import "./styles/daemon.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
