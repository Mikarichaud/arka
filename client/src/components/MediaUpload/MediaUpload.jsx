import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import './MediaUpload.css';

export default function MediaUpload({ onUploaded }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | done | error
  const [previews, setPreviews] = useState([]);

  const handleChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setStatus('uploading');

    const uploaded = [];
    for (const file of files) {
      const preview = URL.createObjectURL(file);
      setPreviews((prev) => [...prev, { preview, type: file.type }]);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploaded.push(res.data.url);
        onUploaded?.(res.data.url);
      } catch {
        setStatus('error');
        return;
      }
    }

    setStatus('done');
    e.target.value = '';
  };

  return (
    <div className="media-upload">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        capture="environment"
        className="media-upload-input"
        onChange={handleChange}
      />

      {status !== 'done' && (
        <button
          className={`media-upload-btn ${status === 'uploading' ? 'uploading' : ''}`}
          onClick={() => inputRef.current?.click()}
          disabled={status === 'uploading'}
        >
          {status === 'uploading' ? (
            <span className="media-spinner" />
          ) : (
            '📸'
          )}
          <span>{status === 'uploading' ? 'Upload...' : 'Ajouter une photo/vidéo'}</span>
        </button>
      )}

      <AnimatePresence>
        {previews.length > 0 && (
          <motion.div className="media-previews"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {previews.map((p, i) => (
              <div key={i} className="media-preview-item">
                {p.type.startsWith('video') ? (
                  <video src={p.preview} className="media-thumb" muted playsInline />
                ) : (
                  <img src={p.preview} alt="" className="media-thumb" />
                )}
                {status === 'done' && <span className="media-check">✓</span>}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {status === 'error' && (
        <p className="media-error">Oups, l'upload a raté. Réessaie !</p>
      )}
    </div>
  );
}
