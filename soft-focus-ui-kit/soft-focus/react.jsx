import React, {useId} from 'react';

// Import tokens.css and components.css once in your application entry.
export function Button({variant = 'primary', className = '', type = 'button', children, ...props}) {
  return <button {...props} type={type} className={`sf-button ${variant === 'primary' ? '' : `sf-button--${variant}`} ${className}`}>{children}</button>;
}

export function Card({tone, className = '', children, ...props}) {
  return <section {...props} className={`sf-card ${tone ? `sf-card--${tone}` : ''} ${className}`}>{children}</section>;
}

export function Field({label, hint, error, id, ...props}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const description = error || hint;
  return <div className={`sf-field ${error ? 'sf-field--error' : ''}`}>
    <label htmlFor={fieldId}>{label}</label>
    <input {...props} id={fieldId} className="sf-input" aria-invalid={error ? true : undefined} aria-describedby={description ? `${fieldId}-description` : undefined}/>
    {description && <span id={`${fieldId}-description`} className={error ? 'sf-error' : 'sf-hint'}>{description}</span>}
  </div>;
}

export function SegmentedControl({label, options, value, onChange}) {
  return <div className="sf-segmented" role="group" aria-label={label}>
    {options.map(option => <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}

// icons should be decorative SVG elements with aria-hidden="true".
export function BottomNav({label = 'เมนูหลัก', items, value, onChange}) {
  return <nav className="sf-nav" aria-label={label}>
    {items.map(item => <button key={item.value} type="button" aria-current={item.value === value ? 'page' : undefined} onClick={() => onChange(item.value)}>{item.icon}<span>{item.label}</span></button>)}
  </nav>;
}
