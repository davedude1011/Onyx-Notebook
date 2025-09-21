import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './tailwind.css'
import App from './App.tsx'
import { MathJaxContext } from 'better-react-mathjax'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
)
