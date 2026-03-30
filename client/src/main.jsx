import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import store from './store';
import AuthInit from './components/AuthInit';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { CallProvider } from './context/CallContext';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ReduxProvider store={store}>
      <AuthInit>
      <ThemeProvider>
        <SocketProvider>
          <CallProvider>
          <HelmetProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </HelmetProvider>
          </CallProvider>
        </SocketProvider>
      </ThemeProvider>
      </AuthInit>
    </ReduxProvider>
  </React.StrictMode>,
);
