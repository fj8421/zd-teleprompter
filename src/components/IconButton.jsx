import '../styles/apple.css';

export const IconButton = ({ icon, label, onClick, className = '' }) => {
  return (
    <button className={`icon-btn ${className}`} onClick={onClick} aria-label={label} title={label} type="button">
      {icon}
    </button>
  );
};
