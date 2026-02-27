import { useCallback, useEffect, useRef, useState } from 'react';
import { format, isValid, parse, addDays } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

const DATE_FORMAT = 'yyyy-MM-dd';

interface GoalDatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}

export function GoalDatePicker({
  id = 'goalDate',
  value,
  onChange,
  ariaInvalid,
  ariaDescribedBy,
}: GoalDatePickerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    if (value) {
      const parsed = parse(value, DATE_FORMAT, new Date());
      return isValid(parsed) ? parsed : new Date();
    }
    return new Date();
  });

  const selectedDate = value && isValid(parse(value, DATE_FORMAT, new Date()))
    ? parse(value, DATE_FORMAT, new Date())
    : undefined;

  const tomorrow = addDays(new Date(), 1);
  tomorrow.setHours(0, 0, 0, 0);

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        onChange(format(date, DATE_FORMAT));
        setIsOpen(false);
      }
    },
    [onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    onChange(next);
    const parsed = parse(next, DATE_FORMAT, new Date());
    if (isValid(parsed)) {
      setMonth(parsed);
    }
  };

  const handleInputFocus = () => setIsOpen(true);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className="goal-date-picker">
      <input
        id={id}
        type="text"
        className="goal-date-input"
        value={value}
        placeholder="e.g. 2025-03-15"
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        autoComplete="off"
      />
      {isOpen && (
        <div className="goal-date-popover" role="dialog" aria-label="Choose goal date">
          <DayPicker
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={{ before: tomorrow }}
            animate
            startMonth={new Date()}
            className="rdp-root"
          />
        </div>
      )}
    </div>
  );
}
