import * as Select from '@radix-ui/react-select';

export interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder?: string;
}

export function FormSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
}: FormSelectProps) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger id={id} className="form-select-trigger">
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="form-select-icon" aria-hidden>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 4.5L6 7.5L9 4.5" />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="form-select-content" position="popper" sideOffset={4}>
          <Select.Viewport className="form-select-viewport">
            {options.map((opt) => (
              <Select.Item
                key={opt.value}
                value={opt.value}
                className="form-select-item"
              >
                <Select.ItemText>{opt.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
