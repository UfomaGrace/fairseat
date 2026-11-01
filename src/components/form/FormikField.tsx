// FormikField: one Formik-connected form field (label + control + hint + error).
//
//   <FormikField name="email" label="Email" type="email" required />
//   <FormikField name="notes" label="Notes" as="textarea" hint="Optional" />
//   <FormikField name="group" label="Blood group" as="select" options={groups} />
//
// - Reads value/touched/error from Formik with useField, so the form only needs a name.
// - FormField does the a11y wiring: label htmlFor, aria-invalid, aria-describedby (hint + error).
// - The error only shows once the field is touched (blurred, changed, or the form was submitted).
// - Every control is at least 44px tall and keeps the tokens' visible focus ring.
// - Password options, both off by default:
//     <FormikField name="password" label="Password" type="password" revealable capsLockHint />
//   revealable puts a 44×44 show/hide toggle in the endAdornment slot (it replaces any endAdornment).
//   capsLockHint shows "Caps Lock is on" under the input while it is focused and Caps Lock is on.
//   It is a hint, not an error, so it never sets aria-invalid; a polite live region announces it.

import { useField } from "formik";
import { ArrowBigUp, Eye, EyeOff } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { capsLockState } from "./capsLock";
import { FormField, type FieldControlProps } from "../../components/ui/form-field";
import { Input, type InputProps } from "../../components/ui/input";
import { Select, type SelectOption } from "../../components/ui/select";

// Props FormikField sets itself, so callers can't pass them.
type ManagedProps =
  | "name"
  | "id"
  | "value"
  | "onChange"
  | "onBlur"
  | "className"
  | "required"
  | "aria-describedby"
  | "aria-invalid"
  | "aria-required";

type CommonProps = {
  name: string;
  label: string;
  hint?: string;
  hintPlacement?: "above" | "below";
  required?: boolean;
  className?: string;
};

type InputFieldProps = CommonProps &
  Omit<InputProps, ManagedProps> & {
    as?: "input";
    /** Rendered inside the right edge of the input, e.g. a show-password button. */
    endAdornment?: ReactNode;
    /** Adds a show/hide password toggle. Use with type="password". */
    revealable?: boolean;
    /** Shows "Caps Lock is on" under the input while Caps Lock is on. */
    capsLockHint?: boolean;
  };

type TextareaFieldProps = CommonProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, ManagedProps> & {
    as: "textarea";
  };

type SelectFieldProps = CommonProps & {
  as: "select";
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
};

export type FormikFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

// 44px minimum touch height for every control.
const controlHeight = "h-11";

// components/ui/textarea.tsx is still an empty stub, so this mirrors the shared Input's styling.
const textareaClasses = cn(
  "min-h-24 w-full rounded-[var(--radius-md)] px-3 py-2.5 text-sm resize-y",
  "bg-[var(--color-bg)] text-[var(--color-text)] font-[family-name:var(--font-sans)]",
  "border border-[var(--color-border-input)]",
  "placeholder:text-[var(--color-text-muted)]",
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)]",
  "focus-visible:[outline-offset:var(--focus-ring-offset)]",
  "aria-[invalid=true]:border-2 aria-[invalid=true]:border-[var(--color-danger)]",
  "disabled:cursor-not-allowed disabled:bg-[var(--color-surface)] disabled:opacity-60",
);

export function FormikField(props: FormikFieldProps) {
  const { name, label, hint, hintPlacement, required, className, ...variant } = props;
  const [field, meta, helpers] = useField<string>(name);
  const error = meta.touched && meta.error ? meta.error : undefined;
  const [revealed, setRevealed] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  function renderControl(control: FieldControlProps) {
    if (variant.as === "select") {
      return (
        <Select
          {...control}
          name={field.name}
          options={variant.options}
          placeholder={variant.placeholder}
          disabled={variant.disabled}
          required={required}
          value={field.value || undefined}
          onValueChange={(next) => {
            // Radix Select has no blur event for us, so choosing a value counts as touching it.
            void helpers.setValue(next ?? "");
            void helpers.setTouched(true, false);
          }}
          className={cn(
            controlHeight,
            "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)]",
            "focus-visible:outline-offset-(--focus-ring-offset)",
          )}
        />
      );
    }

    if (variant.as === "textarea") {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- drop "as" so it never reaches the DOM
      const { as: _as, ...rest } = variant;
      return <textarea {...rest} {...control} {...field} value={field.value ?? ""} required={required} className={textareaClasses} />;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- same as above
    const { as: _as, endAdornment: givenAdornment, revealable, capsLockHint, onKeyDown, onKeyUp, ...rest } = variant;

    function trackCapsLock(event: KeyboardEvent<HTMLInputElement>) {
      const on = capsLockState(event);
      if (on !== null) setCapsOn(on);
    }

    // One accessible name; aria-pressed carries the state ("Show password, toggle button, pressed").
    const endAdornment = revealable ? (
      <button
        type="button"
        aria-label="Show password"
        aria-pressed={revealed}
        aria-controls={control.id}
        onClick={() => setRevealed((on) => !on)}
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-(--radius-md) text-(--color-text-muted) hover:text-(--color-text)",
          "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)",
        )}
      >
        {revealed ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
      </button>
    ) : (
      givenAdornment
    );

    const input = (
      <Input
        {...rest}
        {...control}
        {...field}
        type={revealable ? (revealed ? "text" : "password") : rest.type}
        value={field.value ?? ""}
        required={required}
        onKeyDown={(event) => {
          if (capsLockHint) trackCapsLock(event);
          onKeyDown?.(event);
        }}
        onKeyUp={(event) => {
          if (capsLockHint) trackCapsLock(event);
          onKeyUp?.(event);
        }}
        onBlur={(event) => {
          field.onBlur(event);
          setCapsOn(false);
        }}
        className={cn(controlHeight, endAdornment ? "pr-12" : undefined)}
      />
    );

    const fieldControl = endAdornment ? (
      <div className="relative">
        {input}
        <div className="absolute inset-y-0 right-0 flex items-center">{endAdornment}</div>
      </div>
    ) : (
      input
    );

    if (!capsLockHint) return fieldControl;
    return (
      <>
        {fieldControl}
        {/* Always rendered: a live region must exist before its text changes to be announced. */}
        <div aria-live="polite">
          {capsOn && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-(--color-copper-wash) px-2.5 py-1 text-xs font-medium text-(--color-copper-deep)">
              <ArrowBigUp aria-hidden="true" className="size-3.5" />
              Caps Lock is on
            </p>
          )}
        </div>
      </>
    );
  }

  return (
    <FormField
      label={label}
      hint={hint}
      hintPlacement={hintPlacement}
      error={error}
      required={required}
      className={className}
    >
      {renderControl}
    </FormField>
  );
}
