import React, { useRef } from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from "buffer/index";
import Buttons from "./Buttons";
import Home from "./Home";
import "./root.css";

function App() {
  const page = useRef(
    window.location.pathname.startsWith("/streams/") ? Buttons : Home
  );
  return <page.current />;
}

// Buffer polyfill required for @elgato-stream-deck/webhid
window.Buffer = Buffer as any;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
