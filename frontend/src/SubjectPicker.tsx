import { subjectOptions, type SubjectCode } from "./uiTypes";

type SubjectPickerProps = {
  value: SubjectCode;
  onChange: (value: SubjectCode) => void;
  label: string;
  className?: string;
};

export function SubjectPicker({ value, onChange, label, className = "" }: SubjectPickerProps) {
  return (
    <label className={["subject-choice", className].filter(Boolean).join(" ")}>
      <span>{label}</span>
      <div className="subject-select-wrap">
        <select className="subject-select" value={value} onChange={(event) => onChange(event.target.value as SubjectCode)}>
          {subjectOptions.map((subject) => (
            <option key={subject.value} value={subject.value}>
              {subject.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
