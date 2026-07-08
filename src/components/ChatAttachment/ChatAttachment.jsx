import { resolveAssetUrl } from '../../api';
import './ChatAttachment.css';

const formatFileSize = (value) => {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileTypeLabel = (mimeType = '', fileName = '') => {
  if (mimeType === 'application/pdf' || /\.pdf$/i.test(fileName)) return 'PDF';
  if (mimeType.startsWith('image/')) return 'Image';
  if (/spreadsheet|excel|\.xlsx?$/i.test(`${mimeType} ${fileName}`)) return 'Spreadsheet';
  if (/word|document|\.docx?$/i.test(`${mimeType} ${fileName}`)) return 'Document';
  if (/presentation|powerpoint|\.pptx?$/i.test(`${mimeType} ${fileName}`)) return 'Presentation';
  if (/zip|\.zip$/i.test(`${mimeType} ${fileName}`)) return 'ZIP';
  return 'File';
};

const ChatAttachment = ({ message }) => {
  const path = message?.attachment_path;
  if (!path) return null;

  const name = message.attachment_name || 'Attachment';
  const mimeType = message.attachment_mime_type || '';
  const url = resolveAssetUrl(path, '/uploads/chat-files');
  const isImage = mimeType.startsWith('image/');

  return (
    <a
      className={`chat-attachment ${isImage ? 'is-image' : ''}`}
      href={url}
      target="_blank"
      rel="noreferrer"
      title={`Open ${name}`}
    >
      {isImage && <img src={url} alt={name} />}
      <span className="chat-attachment-icon">{fileTypeLabel(mimeType, name)}</span>
      <span className="chat-attachment-copy">
        <strong>{name}</strong>
        <small>{[fileTypeLabel(mimeType, name), formatFileSize(message.attachment_size)].filter(Boolean).join(' · ')}</small>
      </span>
      <span className="chat-attachment-action">View</span>
    </a>
  );
};

export default ChatAttachment;
