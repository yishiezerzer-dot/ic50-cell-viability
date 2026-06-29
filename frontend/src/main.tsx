import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import OverlayManager from "./components/OverlayManager";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OverlayManager />
  </StrictMode>,
);
