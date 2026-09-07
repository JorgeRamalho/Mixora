import { useState, type ChangeEvent } from "react";

type PasswordFieldProps = {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  "aria-label": string;
};

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="password-field-icon">
      <path
        d="M2.5 12s3.4-7 9.5-7 9.5 7 9.5 7-3.4 7-9.5 7-9.5-7-9.5-7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.7" />
      {off ? (
        <path d="M4 20 20 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      ) : null}
    </svg>
  );
}

export function PasswordField({
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
  "aria-label": ariaLabel,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="password-field">
      <input
        type={visible ? "text" : "password"}
        name={name}
        aria-label={ariaLabel}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        spellCheck={false}
      />
      <button
        type="button"
        className="password-field-toggle"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        <EyeIcon off={visible} />
      </button>
    </div>
  );
}
