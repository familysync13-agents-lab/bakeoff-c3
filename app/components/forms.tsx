import { useId } from "react";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-slate-300 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

export const dangerButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-60";

export const textLinkClass =
  "font-medium text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 rounded";

/** Form-level error summary. role=alert so that assistive technology announces it when it appears. */
export function FormAlert({ id, messages }: { id?: string; messages: readonly string[] }) {
  if (messages.length === 0) return null;
  return (
    <div
      id={id}
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5">
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

type TextFieldProps = {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  defaultValue?: string;
  autoComplete?: string;
  hint?: string;
  /** Id of the form's alert when it describes a problem with this field. */
  errorId?: string;
};

/**
 * Labelled text input. Deliberately no `required` / `maxLength` attributes: the server validates and explains the
 * problem in the form's single alert (FormAlert), which works the same with and without JavaScript.
 */
export function TextField({
  label,
  name,
  type = "text",
  defaultValue,
  autoComplete,
  hint,
  errorId,
}: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const describedBy = [errorId ?? "", hint ? hintId : ""].filter(Boolean).join(" ");
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-900">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`mt-1.5 block w-full rounded-lg border bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm focus:outline-2 focus:outline-offset-0 focus:outline-indigo-600 ${
          errorId ? "border-red-600" : "border-slate-300"
        }`}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-slate-600">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Centered card used by the sign-in / sign-up / list forms. */
export function FormPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      {intro && <div className="mt-2 text-slate-700">{intro}</div>}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
