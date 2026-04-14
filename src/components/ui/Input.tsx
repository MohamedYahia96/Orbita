"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./Input.module.css";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  inputSize?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      iconRight,
      inputSize = "md",
      fullWidth = true,
      id,
      className = "",
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${label?.replace(/\s+/g, "-").toLowerCase()}`;

    const wrapperClasses = [
      styles.wrapper,
      fullWidth ? styles.fullWidth : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const fieldClasses = [
      styles.field,
      styles[inputSize],
      error ? styles.fieldError : "",
      icon ? styles.hasIconLeft : "",
      iconRight ? styles.hasIconRight : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={styles.inputWrap}>
          {icon && <span className={styles.iconLeft}>{icon}</span>}
          <input ref={ref} id={inputId} className={fieldClasses} {...props} />
          {iconRight && <span className={styles.iconRight}>{iconRight}</span>}
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {!error && hint && <p className={styles.hint}>{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
