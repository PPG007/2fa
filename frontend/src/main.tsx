import { App } from "antd";
import React from 'react'
import ReactDOM from 'react-dom/client'
import MyApp from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App>
      <MyApp/>
    </App>
  </React.StrictMode>,
)
