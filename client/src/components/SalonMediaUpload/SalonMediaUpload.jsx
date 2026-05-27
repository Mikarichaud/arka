import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../Icon/Icon';
import api from '../../services/api';
import '../MediaUpload/MediaUpload.css';

// Upload média scopé à un salon : poste sur /api/salons/:code/media/upload avec
// le connectionToken en header x-salon-token (membre du salon, pas besoin d'être
// connecté). Le serveur exige que le HOST soit Premium (gate "host pays for the
// group"). Le parent reçoit la URL via onUploaded pour broadcaster via socket.
export default function SalonMediaUpload({ code, connectionToken, hostIsPremium, onUploaded }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [previews, setPreviews] = useState([]);

  const handleChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setStatus('uploading');
    setErrorMsg('');

    for (const file of files) {
      const preview = URL.createObjectURL(file);
      const type = file.type;
      setPreviews((prev) => [...prev, { preview, type }]);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await api.post(`/salons/${code}/media/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-salon-token': connectionToken,
          },
        });
        onUploaded?.(res.data.url, res.data.resourceType);
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.response?.data?.message || 'Oups, l\'upload a raté. Réessaie !');
        e.target.value = '';
        return;
      }
    }

    setStatus('done');
    e.target.value = '';
  };

  if (!hostIsPremium) {
    return (
      <div className="media-upload">
        <button className="media-upload-btn" disabled title="Le patron du salon doit être Premium pour les souvenirs photo">
          <Icon name="lock" size={16} />
          <span>Souvenirs réservés aux salons Premium</span>
        </button>
      </div>
    );
  }

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
            <Icon name="camera" size={18} />
          )}
          <span>{status === 'uploading' ? 'Upload...' : 'Garder ce moment 📸'}</span>
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
                {status === 'done' && <span className="media-check"><Icon name="check" size={14} /></span>}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {status === 'error' && (
        <p className="media-error">{errorMsg}</p>
      )}
    </div>
  );
}
