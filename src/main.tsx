import { createRoot } from 'react-dom/client'
import '@fontsource/noto-serif-tc/700.css'
import '@fontsource/noto-sans-tc/400.css'
import '@fontsource/noto-sans-tc/500.css'
import './styles/global.css'
import App from './App'

// 不使用 StrictMode：double-invoked effects 會重播開場運鏡並重建 WebGL context
createRoot(document.getElementById('root')!).render(<App />)
