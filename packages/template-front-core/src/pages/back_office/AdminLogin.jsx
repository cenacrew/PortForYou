import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../utils';
import { Box, Button, Container, TextField, Typography, Paper, Stack } from '@mui/material';

export default function AdminLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    fetch(apiUrl('/auth/login'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t('adminLogin.loginError'));
        return data;
      })
      .then(() => {
        localStorage.setItem('logged_in', 'true');
        navigate('/admin/back-office');
      })
      .catch((err) => setError(err.message || t('adminLogin.loginError')))
      .finally(() => setLoading(false));
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography component="h1" variant="h4" gutterBottom>
              {t('adminLogin.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('adminLogin.subtitle')}
            </Typography>
          </Box>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                label={t('adminLogin.emailLabel')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label={t('adminLogin.passwordLabel')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
              />
              {error && (
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              )}
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? t('adminLogin.loggingIn') : t('adminLogin.loginButton')}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}
