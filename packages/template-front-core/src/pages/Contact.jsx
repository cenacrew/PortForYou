import React, { useState } from 'react';
import { Container, Typography, Divider, TextField, Button, Stack, Alert } from '@mui/material';
import { apiUrl } from '../utils';

export default function Contact() {
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
      if (!res.ok) throw new Error(data?.error || "L'envoi a échoué, réessayez plus tard.");
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
        Contact
      </Typography>
      <Divider sx={{ mb: 3 }} />
      {status === 'sent' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Votre message a bien été envoyé, merci !
        </Alert>
      )}
      {status === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}
      <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit}>
        <TextField
          label="Nom"
          fullWidth
          required
          value={form.name}
          onChange={handleChange('name')}
        />
        <TextField
          label="Email"
          type="email"
          fullWidth
          required
          value={form.email}
          onChange={handleChange('email')}
        />
        <TextField
          label="Message"
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
          {status === 'sending' ? 'Envoi…' : 'Envoyer'}
        </Button>
      </Stack>
    </Container>
  );
}
