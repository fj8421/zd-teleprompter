import '../styles/apple.css';

export const Toggle = ({ value, onChange }) => {
  const handleClick = (event) => {
    event.stopPropagation();
    onChange(!value);
  };

  return (
    <div
      className={`toggle ${value ? 'active' : ''}`}
      role="switch"
      aria-checked={Boolean(value)}
      onClick={handleClick}
    >
      <div className="toggle-thumb" />
    </div>
  );
};
