import React, { useRef } from "react";
import ReactDOM from "react-dom/client";
import Buttons from "./Buttons";
import Home from "./Home";
import "./root.css";

function App() {
  const page = useRef(
    window.location.pathname.startsWith("/streams/") ? Buttons : Home
  );
  return <page.current />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
