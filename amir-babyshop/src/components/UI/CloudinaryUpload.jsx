import { useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export default function CloudinaryUpload({ onUpload, label = 'Upload Image', className = '' }) {
  const widgetRef = useRef(null);

  // Keep latest onUpload in a ref so the widget effect never re-fires
  const onUploadRef = useRef(onUpload);
  useEffect(() => { onUploadRef.current = onUpload; }, [onUpload]);

  useEffect(() => {
    if (!window.cloudinary) {
      console.error('[CloudinaryUpload] Widget script not loaded. Check index.html.');
      return;
    }
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      console.error('[CloudinaryUpload] Missing cloud name or preset.');
      return;
    }

    widgetRef.current = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        sources: ['local', 'camera', 'url'],
        multiple: false,
        maxImageFileSize: 5_000_000,
        maxImageWidth: 1600,
        maxImageHeight: 1600,
        cropping: false,
        resourceType: 'image',
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      },
      (error, result) => {
        if (error) {
          console.warn('[CloudinaryUpload] Widget error:', error);
          return;
        }
        if (result?.event === 'success') {
          onUploadRef.current?.(result.info.secure_url);
        }
      }
    );
  }, []);   // ← EMPTY dep array — widget created once, never recreated

  const handleClick = () => {
    if (widgetRef.current) widgetRef.current.open();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors w-full ${className}`}
    >
      <Upload size={16} />
      {label}
    </button>
  );
}