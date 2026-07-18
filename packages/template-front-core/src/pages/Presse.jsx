import React from 'react';
import { Container, Typography, Divider, List, ListItem, ListItemText } from '@mui/material';

const articles = [
  { title: 'Interview exclusive', source: 'Le Journal', date: '2024-05-12' },
  { title: 'Exposition majeure', source: 'Art & Culture', date: '2023-11-02' },
  { title: 'Parcours et influences', source: 'Magazine Créatif', date: '2022-09-18' },
];

export default function Presse() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
        Presse
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <List>
        {articles.map((a) => (
          <ListItem key={a.title} divider>
            <ListItemText primary={a.title} secondary={`${a.source} — ${a.date}`} />
          </ListItem>
        ))}
      </List>
    </Container>
  );
}
