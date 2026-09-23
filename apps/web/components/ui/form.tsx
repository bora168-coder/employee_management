import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

const control =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 aria-[invalid=true]:border-red-500';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(control, 'h-10', className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(control, 'h-10', className)} {...props} />
  ),
);
Select.displayName = 'Select';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(control, className)} rows={3} {...props} />
));
Textarea.displayName = 'Textarea';

/**
 * Label + control + hint/error. The label is linked to the control (id/htmlFor),
 * and the error is announced to screen readers (aria-invalid, aria-describedby).
 */
export function Field({
  label,
  error,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  const autoId = useId();
  const child = isValidElement(children) ? (children as ReactElement<{ id?: string }>) : null;
  const id = htmlFor ?? child?.props.id ?? autoId;
  const messageId = `${id}-message`;
  const control = child
    ? cloneElement(child as ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error || hint ? messageId : undefined,
      })
    : children;

  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {control}
      {error ? (
        <p id={messageId} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
