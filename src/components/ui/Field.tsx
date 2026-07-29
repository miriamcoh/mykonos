import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const baseInput =
  "w-full rounded-xl border border-aegean-100 bg-aegean-50/40 px-3.5 py-2.5 text-sm text-aegean-900 placeholder:text-aegean-300 focus:outline-none focus:ring-2 focus:ring-aegean-300 focus:bg-white transition";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block mb-3.5">
      <span className="block text-xs font-semibold text-aegean-500 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className={`${baseInput} resize-none ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${baseInput} ${props.className ?? ""}`}>
      {props.children}
    </select>
  );
}
