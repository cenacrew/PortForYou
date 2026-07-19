import React, { useState } from 'react';
import { Container, Typography, Divider, TextField, Button, Stack, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../utils';

export default function Contact() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch(apiUrl('/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t('contact.genericSendError'));
      setStatus('sent');
      setForm({ name: '', email: '', message: '', website: '' });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
        {t('contact.heading')}
      </Typography>
      <Divider sx={{ mb: 3 }} />
      {status === 'sent' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t('contact.sentAlert')}
        </Alert>
      )}
      {status === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}
      <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit}>
        <TextField
          label={t('contact.nameLabel')}
          fullWidth
          required
          value={form.name}
          onChange={handleChange('name')}
        />
        <TextField
          label={t('contact.emailLabel')}
          type="email"
          fullWidth
          required
          value={form.email}
          onChange={handleChange('email')}
        />
        <TextField
          label={t('contact.messageLabel')}
          fullWidth
          required
          multiline
          minRows={4}
          value={form.message}
          onChange={handleChange('message')}
        />
        {/* Honeypot anti-spam : invisible pour les humains */}
        <input
          type="text"
          value={form.website}
          onChange={handleChange('website')}
          style={{ position: 'absolute', left: '-9999px' }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <Button type="submit" variant="contained" size="large" disabled={status === 'sending'}>
          {status === 'sending' ? t('contact.sending') : t('contact.send')}
        </Button>
      </Stack>
    </Container>
  );
}
