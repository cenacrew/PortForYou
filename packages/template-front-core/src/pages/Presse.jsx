import React from 'react';
import { Container, Typography, Divider, List, ListItem, ListItemText } from '@mui/material';
import { useTranslation } from 'react-i18next';

const ARTICLE_DATES = ['2024-05-12', '2023-11-02', '2022-09-18'];

export default function Presse() {
  const { t } = useTranslation();
  const demoArticles = t('press.demoArticles', { returnObjects: true });
  const articles = demoArticles.map((a, i) => ({ ...a, date: ARTICLE_DATES[i] }));

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
        {t('press.heading')}
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
