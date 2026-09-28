import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="block space-y-2">
      {label ? <span className="block text-xs font-medium text-foreground">{label}</span> : null}
      {children}
      {error ? <span className="block text-xs leading-5 text-error">{error}</span> : null}
      {!error && hint ? <span className="block text-xs leading-5 text-muted">{hint}</span> : null}
    </label>
  );
}

export const fieldClassName =
  "field min-h-11 w-full rounded-xl px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

export function FieldInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClassName} ${props.className ?? ""}`} />;
}

export function FieldSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClassName} ${props.className ?? ""}`} />;
}

export function FieldTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClassName} min-h-28 py-3 ${props.className ?? ""}`} />;
}
