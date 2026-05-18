import Icon from '../Icon/Icon';
import './EmptyState.css';

export default function EmptyState({ icon = 'wheel', title, description, children }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon name={icon} size={32} />
      </div>
      {title && <h3 className="empty-state-title">{title}</h3>}
      {description && <p className="empty-state-desc">{description}</p>}
      {children && <div className="empty-state-actions">{children}</div>}
    </div>
  );
}
