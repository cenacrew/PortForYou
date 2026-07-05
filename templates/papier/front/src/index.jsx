import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { SiteConfigProvider, useSiteConfig } from './contexts/SiteConfigContext';

function DynamicThemeProvider({ children }) {
  const config = useSiteConfig();
  const bg = config?.bgColor || '#f9f6ef';
  const content = config?.contentColor || '#2a2721';
  const theme = createTheme({
    palette: {
      primary: { main: content, contrastText: bg },
      secondary: { main: '#a142f4' },
      background: { default: bg, paper: bg },
      text: { primary: content, secondary: content },
      divider: content + '20',
      common: { black: content, white: bg },
    },
    typography: {
      fontFamily: "'Jost', 'Inter', sans-serif",
      h1: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, letterSpacing: '0.01em' },
      h2: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 },
      h3: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 },
      h4: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 },
      body1: { fontWeight: 300 },
      button: { letterSpacing: '0.08em' },
    },
  });
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SiteConfigProvider>
      <DynamicThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DynamicThemeProvider>
    </SiteConfigProvider>
  </React.StrictMode>,
);
