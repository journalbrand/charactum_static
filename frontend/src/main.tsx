import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from "./App"
import GrammarPage from './grammar/GrammarPage'
import AboutPage from './about/AboutPage'
import NavigationBar from './home/NavigationBar'

const RootApp = () => {
  return (
    <BrowserRouter>
      <NavigationBar />
      <Routes>
        <Route path="/grammar/*" element={<GrammarPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  )
}
import './styles/main.scss'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <RootApp />
  </React.StrictMode>
) 
