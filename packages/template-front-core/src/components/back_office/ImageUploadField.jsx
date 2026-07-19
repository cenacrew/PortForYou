import React, { useState, useRef } from 'react';
import { Box, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CropDialog from './CropDialog';

export default function ImageUploadField({ label, aspect, currentUrl, onBlob, cropTitle }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [rawSrc, setRawSrc] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRawSrc(reader.result);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCrop = (blob) => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    setCropOpen(false);
    setRawSrc(null);
    onBlob(blob);
  };

  const displayUrl = preview || currentUrl;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {displayUrl ? (
        <Box
          component="img"
          src={displayUrl}
          alt=""
          sx={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 1 }}
        />
      ) : (
        <Box sx={{ height: 100, bgcolor: 'action.hover', borderRadius: 1 }} />
      )}
      <Button variant="outlined" size="small" onClick={() => inputRef.current?.click()}>
        {label || t('imageUploadField.defaultLabel')}
      </Button>
      <input ref={inputRef} hidden type="file" accept="image/*" onChange={handleFileChange} />
      <CropDialog
        open={cropOpen}
        imageSrc={rawSrc}
        aspect={aspect}
        title={cropTitle}
        onCrop={handleCrop}
        onClose={() => {
          setCropOpen(false);
          setRawSrc(null);
        }}
      />
    </Box>
  );
}
