import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./tailwind.css";
import { MathJaxContext } from "better-react-mathjax";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MathJaxContext config={{
      loader: {
        load: ['[tex]/color', '[tex]/colorv2']
      },
      tex: {
        packages: {
          '[+]': ['color', 'colorv2']
        },
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$']],
      },
    }}>
      <App />
    </MathJaxContext>
  </React.StrictMode>,
);
