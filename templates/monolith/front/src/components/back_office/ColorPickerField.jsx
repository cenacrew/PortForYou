import React, { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Box, Typography, Popover, Tooltip } from '@mui/material';

const MAX_RECENT = 5;

function getRecent(category) {
  try {
    return JSON.parse(localStorage.getItem(`recentColors_${category}`) || '[]');
  } catch {
    return [];
  }
}

function saveRecent(category, color) {
  const next = [color, ...getRecent(category).filter((c) => c !== color)].slice(0, MAX_RECENT);
  localStorage.setItem(`recentColors_${category}`, JSON.stringify(next));
}

export default function ColorPickerField({ label, value, onChange, category }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [recent, setRecent] = useState(() => getRecent(category));

  const handleOpen = (e) => setAnchorEl(e.currentTarget);

  const handleClose = () => {
    if (value) {
      saveRecent(category, value);
      setRecent(getRecent(category));
    }
    setAnchorEl(null);
  };

  const pickRecent = (color) => {
    onChange(color);
    saveRecent(category, color);
    setRecent(getRecent(category));
  };

  return (
    <Box>
      <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          onClick={handleOpen}
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1,
            flexShrink: 0,
            bgcolor: value || '#ffffff',
            border: '2px solid',
            borderColor: 'divider',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
            '&:hover': { borderColor: 'primary.main' },
          }}
        />
        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
          {value || '#ffffff'}
        </Typography>
      </Box>

      {recent.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" color="text.disabled" sx={{ mr: 0.5 }}>
            Récentes :
          </Typography>
          {recent.map((c) => (
            <Tooltip key={c} title={c}>
              <Box
                onClick={() => pickRecent(c)}
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '4px',
                  bgcolor: c,
                  border: '1.5px solid',
                  borderColor: c === value ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              />
            </Tooltip>
          ))}
        </Box>
      )}

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 2 }}>
          <HexColorPicker color={value || '#ffffff'} onChange={onChange} />
          <Typography
            variant="caption"
            color="text.disabled"
            display="block"
            sx={{ mt: 1, textAlign: 'center' }}
          >
            Fermer pour sauvegarder dans les récentes
          </Typography>
        </Box>
      </Popover>
    </Box>
  );
}
