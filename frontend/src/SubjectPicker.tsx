import { useId } from "react";
import { subjectOptions, type SubjectCode } from "./uiTypes";

type SubjectPickerProps = {
  value: SubjectCode;
  onChange: (value: SubjectCode) => void;
  label: string;
  compact?: boolean;
  className?: string;
};

export function SubjectPicker({ value, onChange, label, compact = false, className = "" }: SubjectPickerProps) {
  const name = useId();

  return (
    <fieldset className={["subject-choice", compact ? "subject-choice-compact" : "", className].filter(Boolean).join(" ")}>
      <legend>{label}</legend>
      <div className="subject-choice-options" role="radiogroup" aria-label={label}>
        {subjectOptions.map((subject) => (
          <label className={value === subject.value ? "subject-choice-card active" : "subject-choice-card"} key={subject.value}>
            <input
              type="radio"
              name={name}
              value={subject.value}
              checked={value === subject.value}
              onChange={() => onChange(subject.value)}
            />
            <span>{subject.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
