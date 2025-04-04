import React from "react";
import ReactDOM from "react-dom/client";
import Timeline from "./components/Timeline";
import "./app.css";

function App() {
  return <Timeline />;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
