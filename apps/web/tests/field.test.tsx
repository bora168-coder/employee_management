import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field, Input } from '@/components/ui/form';

describe('Field', () => {
  it('links the label to the control (accessible name)', () => {
    render(
      <Field label="Name">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText('Name')).toBeInstanceOf(HTMLInputElement);
  });

  it('marks the control invalid and describes it with the error', () => {
    render(
      <Field label="Phone" error="Invalid Cambodian phone number">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText('Phone');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Invalid Cambodian phone number');
  });
});
