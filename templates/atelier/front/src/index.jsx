import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { SiteConfigProvider, useSiteConfig } from './contexts/SiteConfigContext';

function DynamicThemeProvider({ children }) {
  const config = useSiteConfig();
  const bg = config?.bgColor || '#ffffff';
  const content = config?.contentColor || '#020403';
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
      fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
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
