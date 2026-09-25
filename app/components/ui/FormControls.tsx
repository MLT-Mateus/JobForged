"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Bold,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileCheck2,
  FileImage,
  FileText,
  Files,
  ImagePlus,
  Images,
  Italic,
  Link2,
  List,
  Plus,
  UploadCloud,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

type FieldBaseProps = {
  label: string;
  helpText?: string;
  error?: string;
  requiredLabel?: string;
  icon?: LucideIcon;
  className?: string;
};

type TextFieldProps = FieldBaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
    endAdornment?: ReactNode;
  };

export function TextField({
  label,
  helpText,
  error,
  requiredLabel,
  icon: Icon,
  endAdornment,
  className = "",
  id,
  type = "text",
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const isPassword = type === "password";
  const isSearch = type === "search";
  const [passwordVisible, setPasswordVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function clearSearch() {
    const input = inputRef.current;
    if (!input) return;
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }

  return (
    <div className={`jf-field ${error ? "is-error" : ""} ${className}`}>
      <label className="jf-field__label" htmlFor={inputId}>
        <b>{label}</b>
        {requiredLabel && <i>{requiredLabel}</i>}
      </label>
      <span className="jf-control">
        {Icon && <Icon size={17} aria-hidden="true" />}
        <input
          {...inputProps}
          ref={inputRef}
          id={inputId}
          type={isPassword && passwordVisible ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={helpText || error ? messageId : undefined}
        />
        {isSearch && (
          <button type="button" className="jf-search-clear" aria-label="Limpar busca" onClick={clearSearch}>
            <X size={17} aria-hidden="true" />
          </button>
        )}
        {endAdornment}
        {isPassword && (
          <button
            type="button"
            className="jf-password-toggle"
            aria-label={passwordVisible ? "Ocultar senha" : "Mostrar senha"}
            aria-controls={inputId}
            aria-pressed={passwordVisible}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
          </button>
        )}
      </span>
      {(error || helpText) && <small id={messageId}>{error ?? helpText}</small>}
    </div>
  );
}

type TextAreaFieldProps = FieldBaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

/** Shared multiline field. Label, validation state and focus styling come from the same field tokens as TextField. */
export function TextAreaField({
  label,
  helpText,
  error,
  requiredLabel,
  className = "",
  id,
  ...textareaProps
}: TextAreaFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;

  return (
    <div className={`jf-field ${error ? "is-error" : ""} ${className}`}>
      <label className="jf-field__label" htmlFor={inputId}>
        <b>{label}</b>
        {requiredLabel && <i>{requiredLabel}</i>}
      </label>
      <span className="jf-control">
        <textarea
          {...textareaProps}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={helpText || error ? messageId : undefined}
        />
      </span>
      {(error || helpText) && <small id={messageId}>{error ?? helpText}</small>}
    </div>
  );
}

type FieldControlProps = FieldBaseProps & {
  children: ReactNode;
};

/** Shared shell for native select or other controls that need their own behavior but the product's field tokens. */
export function FieldControl({
  label,
  helpText,
  error,
  requiredLabel,
  className = "",
  children,
}: FieldControlProps) {
  return (
    <label className={`jf-field jf-field--native ${error ? "is-error" : ""} ${className}`}>
      <span className="jf-field__label">
        <b>{label}</b>
        {requiredLabel && <i>{requiredLabel}</i>}
      </span>
      <span className="jf-control">{children}</span>
      {(error || helpText) && <small className="jf-field__message">{error ?? helpText}</small>}
    </label>
  );
}

function useFloatingMenu(open: boolean, onClose: () => void) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [onClose, open]);

  return rootRef;
}

type DateFieldProps = FieldBaseProps & {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
};

export type DateRangeValue = {
  start: string;
  end: string;
};

type DateRangeFieldProps = FieldBaseProps & {
  id?: string;
  startName?: string;
  endName?: string;
  value?: DateRangeValue;
  defaultValue?: DateRangeValue;
  min?: string;
  max?: string;
  disabled?: boolean;
  onValueChange?: (value: DateRangeValue) => void;
};

const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];
const calendarMonths = Array.from({ length: 12 }, (_, month) => {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(2026, month, 1)).replace(".", "");
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
});
type CalendarView = "days" | "months" | "years";

function dateFromIso(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function dateToIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value?: string) {
  const date = dateFromIso(value);
  return date ? new Intl.DateTimeFormat("pt-BR").format(date) : "Selecione uma data";
}

function formatDateRange(value: DateRangeValue) {
  if (!value.start) return "Selecione um intervalo";
  if (!value.end) return `${formatDate(value.start)} — escolha a data final`;
  return `${formatDate(value.start)} — ${formatDate(value.end)}`;
}

type CalendarPanelProps = {
  id: string;
  label: string;
  initialDate: Date;
  min?: string;
  max?: string;
  selectedStart: string;
  selectedEnd?: string;
  range?: boolean;
  onSelectDate: (value: string) => void;
  onEscape: () => void;
};

function CalendarPanel({
  id,
  label,
  initialDate,
  min,
  max,
  selectedStart,
  selectedEnd = "",
  range = false,
  onSelectDate,
  onEscape,
}: CalendarPanelProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [calendarView, setCalendarView] = useState<CalendarView>("days");
  const [hoveredRangeEnd, setHoveredRangeEnd] = useState("");
  const firstDayOffset = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const rawMonthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(visibleMonth);
  const monthLabel = `${rawMonthLabel.charAt(0).toUpperCase()}${rawMonthLabel.slice(1)}`;
  const visibleYear = visibleMonth.getFullYear();
  const minDate = dateFromIso(min);
  const maxDate = dateFromIso(max);
  const minYear = minDate?.getFullYear();
  const maxYear = maxDate?.getFullYear();
  const usesCompactYearRange = minYear !== undefined && maxYear !== undefined && maxYear - minYear < 12;
  const yearGridStart = usesCompactYearRange ? (minYear ?? visibleYear - 5) : visibleYear - 5;
  const yearGridEnd = usesCompactYearRange ? (maxYear ?? yearGridStart + 11) : yearGridStart + 11;
  const visibleYears = Array.from({ length: yearGridEnd - yearGridStart + 1 }, (_, index) => yearGridStart + index);
  const todayIso = dateToIso(new Date());

  function monthIsAvailable(year: number, month: number) {
    const monthStart = dateToIso(new Date(year, month, 1));
    const monthEnd = dateToIso(new Date(year, month + 1, 0));
    return !((min && monthEnd < min) || (max && monthStart > max));
  }

  function yearIsAvailable(year: number) {
    return calendarMonths.some((_, month) => monthIsAvailable(year, month));
  }

  function stepIsAvailable(direction: -1 | 1) {
    if (calendarView === "days") {
      const target = new Date(visibleYear, visibleMonth.getMonth() + direction, 1);
      return monthIsAvailable(target.getFullYear(), target.getMonth());
    }
    if (calendarView === "months") return yearIsAvailable(visibleYear + direction);
    if (usesCompactYearRange) return false;
    const targetStart = yearGridStart + direction * 12;
    const targetEnd = targetStart + 11;
    return (!minDate || targetEnd >= minDate.getFullYear()) && (!maxDate || targetStart <= maxDate.getFullYear());
  }

  function stepCalendar(direction: -1 | 1) {
    if (calendarView === "days") setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
    if (calendarView === "months") setVisibleMonth((current) => new Date(current.getFullYear() + direction, current.getMonth(), 1));
    if (calendarView === "years") setVisibleMonth((current) => new Date(current.getFullYear() + direction * 12, current.getMonth(), 1));
  }

  function selectMonth(month: number) {
    if (!monthIsAvailable(visibleYear, month)) return;
    setVisibleMonth(new Date(visibleYear, month, 1));
    setCalendarView("days");
  }

  function selectYear(year: number) {
    if (!yearIsAvailable(year)) return;
    let month = visibleMonth.getMonth();
    if (minDate?.getFullYear() === year) month = Math.max(month, minDate.getMonth());
    if (maxDate?.getFullYear() === year) month = Math.min(month, maxDate.getMonth());
    setVisibleMonth(new Date(year, month, 1));
    setCalendarView("days");
  }

  return (
    <div id={id} className={`jf-calendar ${range ? "jf-calendar--range" : ""}`} role="dialog" aria-label={`Escolher ${label}`} onKeyDown={(event) => { if (event.key === "Escape") onEscape(); }}>
      <div className="jf-calendar__header">
        <button type="button" aria-label={calendarView === "years" ? "Anos anteriores" : calendarView === "months" ? "Ano anterior" : "Mês anterior"} disabled={!stepIsAvailable(-1)} onClick={() => stepCalendar(-1)}><ChevronLeft size={16} /></button>
        {calendarView === "days" ? (
          <div className="jf-calendar__period">
            <button type="button" aria-label={`Escolher mês, atual ${monthLabel}`} aria-expanded={false} onClick={() => setCalendarView("months")}>{monthLabel}<ChevronDown size={13} /></button>
            <button type="button" aria-label={`Escolher ano, atual ${visibleYear}`} aria-expanded={false} onClick={() => setCalendarView("years")}>{visibleYear}<ChevronDown size={13} /></button>
          </div>
        ) : (
          <strong>{calendarView === "months" ? visibleYear : `${yearGridStart}–${yearGridEnd}`}</strong>
        )}
        <button type="button" aria-label={calendarView === "years" ? "Próximos anos" : calendarView === "months" ? "Próximo ano" : "Próximo mês"} disabled={!stepIsAvailable(1)} onClick={() => stepCalendar(1)}><ChevronRight size={16} /></button>
      </div>
      {calendarView === "months" && (
        <div className="jf-calendar__picker-grid jf-calendar__picker-grid--months" role="grid" aria-label={`Meses de ${visibleYear}`}>
          {calendarMonths.map((month, index) => <button key={month} type="button" role="gridcell" className={visibleMonth.getMonth() === index ? "is-current" : ""} aria-selected={visibleMonth.getMonth() === index} disabled={!monthIsAvailable(visibleYear, index)} onClick={() => selectMonth(index)}>{month}</button>)}
        </div>
      )}
      {calendarView === "years" && (
        <div className="jf-calendar__picker-grid jf-calendar__picker-grid--years" role="grid" aria-label="Escolher ano">
          {visibleYears.map((year) => <button key={year} type="button" role="gridcell" className={visibleYear === year ? "is-current" : ""} aria-selected={visibleYear === year} disabled={!yearIsAvailable(year)} onClick={() => selectYear(year)}>{year}</button>)}
        </div>
      )}
      {calendarView === "days" && <>
        {range && (
          <div className="jf-calendar__range-status" aria-live="polite">
            <span><small>Início</small><strong>{selectedStart ? formatDate(selectedStart) : "Escolher"}</strong></span>
            <ChevronRight size={15} aria-hidden="true" />
            <span><small>Fim</small><strong>{selectedEnd ? formatDate(selectedEnd) : "Escolher"}</strong></span>
          </div>
        )}
        <div className="jf-calendar__weekdays" aria-hidden="true">{weekDays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
        <div className="jf-calendar__days" role="grid" onPointerLeave={() => setHoveredRangeEnd("")}>
          {Array.from({ length: 42 }, (_, index) => {
            const dayNumber = index - firstDayOffset + 1;
            if (dayNumber < 1 || dayNumber > daysInMonth) return <span key={index} aria-hidden="true" />;
            const dayDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), dayNumber);
            const dayValue = dateToIso(dayDate);
            const unavailable = Boolean((min && dayValue < min) || (max && dayValue > max));
            const isRangeStart = range && selectedStart === dayValue;
            const isRangeEnd = range && selectedEnd === dayValue;
            const previewEnd = selectedEnd || hoveredRangeEnd;
            const isPreviewRange = range && !selectedEnd && Boolean(selectedStart && hoveredRangeEnd && hoveredRangeEnd >= selectedStart);
            const isInRange = range && Boolean(selectedStart && previewEnd && dayValue > selectedStart && dayValue < previewEnd);
            const isSelected = range ? isRangeStart || isRangeEnd : selectedStart === dayValue;
            const dateLabel = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(dayDate);
            const classNames = [
              isSelected ? "is-selected" : "",
              isRangeStart ? "is-range-start" : "",
              isRangeEnd ? "is-range-end" : "",
              isInRange ? "is-in-range" : "",
              isPreviewRange && isInRange ? "is-range-preview" : "",
              todayIso === dayValue ? "is-today" : "",
            ].filter(Boolean).join(" ");
            return (
              <button
                key={dayValue}
                type="button"
                role="gridcell"
                className={classNames}
                aria-label={dateLabel}
                aria-selected={isSelected || isInRange}
                disabled={unavailable}
                onClick={() => onSelectDate(dayValue)}
                onPointerEnter={() => {
                  if (range && selectedStart && !selectedEnd && !unavailable && dayValue >= selectedStart) setHoveredRangeEnd(dayValue);
                }}
                onFocus={() => {
                  if (range && selectedStart && !selectedEnd && !unavailable && dayValue >= selectedStart) setHoveredRangeEnd(dayValue);
                }}
              >
                {dayNumber}
              </button>
            );
          })}
        </div>
      </>}
    </div>
  );
}

export function DateField({
  label,
  helpText,
  error,
  requiredLabel,
  id,
  name,
  value,
  defaultValue,
  min,
  max,
  disabled = false,
  onValueChange,
  className = "",
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const selectedValue = value ?? internalValue;
  const generatedId = useId();
  const buttonId = id ?? generatedId;
  const calendarId = `${buttonId}-calendar`;
  const rootRef = useFloatingMenu(open, () => setOpen(false));

  function selectDate(nextValue: string) {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`jf-field jf-date ${open ? "is-open" : ""} ${error ? "is-error" : ""} ${className}`}>
      <span className="jf-field__label">
        <b>{label}</b>
        {requiredLabel && <i>{requiredLabel}</i>}
      </span>
      <div className="jf-floating-field">
        <button
          id={buttonId}
          type="button"
          className="jf-control jf-date__control"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={calendarId}
          disabled={disabled}
          onClick={() => {
            setOpen((current) => !current);
          }}
          onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
        >
          <CalendarDays size={17} aria-hidden="true" />
          <span className={selectedValue ? "" : "is-placeholder"}>{formatDate(selectedValue)}</span>
          <ChevronDown size={17} aria-hidden="true" />
        </button>
        {open && (
          <CalendarPanel id={calendarId} label={label} initialDate={dateFromIso(selectedValue) ?? new Date()} min={min} max={max} selectedStart={selectedValue} onSelectDate={selectDate} onEscape={() => setOpen(false)} />
        )}
      </div>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      {(error || helpText) && <small className="jf-field__message">{error ?? helpText}</small>}
    </div>
  );
}

export function DateRangeField({
  label,
  helpText,
  error,
  requiredLabel,
  id,
  startName,
  endName,
  value,
  defaultValue,
  min,
  max,
  disabled = false,
  onValueChange,
  className = "",
}: DateRangeFieldProps) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<DateRangeValue>(defaultValue ?? { start: "", end: "" });
  const selectedRange = value ?? internalValue;
  const generatedId = useId();
  const buttonId = id ?? generatedId;
  const calendarId = `${buttonId}-calendar`;
  const rootRef = useFloatingMenu(open, () => setOpen(false));

  function commitRange(nextValue: DateRangeValue) {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  function selectRangeDate(nextDate: string) {
    if (!selectedRange.start || selectedRange.end || nextDate < selectedRange.start) {
      commitRange({ start: nextDate, end: "" });
      return;
    }
    commitRange({ start: selectedRange.start, end: nextDate });
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`jf-field jf-date jf-date-range ${open ? "is-open" : ""} ${error ? "is-error" : ""} ${className}`}>
      <span className="jf-field__label">
        <b>{label}</b>
        {requiredLabel && <i>{requiredLabel}</i>}
      </span>
      <div className="jf-floating-field">
        <button
          id={buttonId}
          type="button"
          className="jf-control jf-date__control jf-date-range__control"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={calendarId}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
        >
          <CalendarDays size={17} aria-hidden="true" />
          <span className={selectedRange.start ? "" : "is-placeholder"}>{formatDateRange(selectedRange)}</span>
          <ChevronDown size={17} aria-hidden="true" />
        </button>
        {open && (
          <CalendarPanel
            id={calendarId}
            label={label}
            initialDate={dateFromIso(selectedRange.start || selectedRange.end) ?? new Date()}
            min={min}
            max={max}
            selectedStart={selectedRange.start}
            selectedEnd={selectedRange.end}
            range
            onSelectDate={selectRangeDate}
            onEscape={() => setOpen(false)}
          />
        )}
      </div>
      {startName && <input type="hidden" name={startName} value={selectedRange.start} />}
      {endName && <input type="hidden" name={endName} value={selectedRange.end} />}
      {(error || helpText) && <small className="jf-field__message">{error ?? helpText}</small>}
    </div>
  );
}

type SelectFieldProps = FieldBaseProps & {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  allowCreate?: boolean;
  createPlaceholder?: string;
  onCreateOption?: (label: string) => void;
};

export function SelectField({
  label,
  helpText,
  error,
  requiredLabel,
  icon: Icon,
  value,
  options,
  placeholder = "Selecione uma opção",
  onValueChange,
  disabled = false,
  allowCreate = false,
  createPlaceholder = "Nome da nova opção",
  onCreateOption,
  className = "",
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [newOption, setNewOption] = useState("");
  const buttonId = useId();
  const menuId = `${buttonId}-options`;
  const rootRef = useFloatingMenu(open, () => setOpen(false));
  const selectedOption = options.find((option) => option.value === value);

  function createOption() {
    const nextOption = newOption.trim();
    if (!nextOption || !onCreateOption) return;
    onCreateOption(nextOption);
    setNewOption("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`jf-field jf-select ${open ? "is-open" : ""} ${error ? "is-error" : ""} ${className}`}>
      <span className="jf-field__label">
        <b>{label}</b>
        {requiredLabel && <i>{requiredLabel}</i>}
      </span>
      <div className="jf-floating-field">
        <button
          id={buttonId}
          type="button"
          className="jf-control jf-select__control"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={menuId}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "ArrowDown") setOpen(true);
          }}
        >
          {Icon && <Icon size={17} aria-hidden="true" />}
          <span className={selectedOption ? "" : "is-placeholder"}>{selectedOption?.label ?? placeholder}</span>
          <ChevronDown size={17} aria-hidden="true" />
        </button>
        {open && (
          <div id={menuId} className="jf-select__menu">
            <div className="jf-select__options" role="listbox" aria-labelledby={buttonId}>
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span>
                    <strong>{option.label}</strong>
                    {option.description && <small>{option.description}</small>}
                  </span>
                  {value === option.value && <Check size={15} aria-hidden="true" />}
                </button>
              ))}
            </div>
            {allowCreate && onCreateOption && (
              <div className="jf-create-option-shell">
                <div className="jf-create-option">
                  <input
                    type="text"
                    value={newOption}
                    placeholder={createPlaceholder}
                    aria-label={createPlaceholder}
                    onChange={(event) => setNewOption(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") { event.preventDefault(); createOption(); }
                      if (event.key === "Escape") setOpen(false);
                    }}
                  />
                  <button type="button" aria-label="Adicionar nova opção" disabled={!newOption.trim()} onClick={createOption}><Plus size={15} /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {(error || helpText) && <small className="jf-field__message">{error ?? helpText}</small>}
    </div>
  );
}

type MultiSelectFieldProps = FieldBaseProps & {
  values: string[];
  options: SelectOption[];
  placeholder?: string;
  onValuesChange: (values: string[]) => void;
  disabled?: boolean;
  allowCreate?: boolean;
  createPlaceholder?: string;
  onCreateOption?: (label: string) => void;
};

export function MultiSelectField({
  label,
  helpText,
  error,
  requiredLabel,
  icon: Icon,
  values,
  options,
  placeholder = "Selecione uma ou mais opções",
  onValuesChange,
  disabled = false,
  allowCreate = false,
  createPlaceholder = "Nome da nova opção",
  onCreateOption,
  className = "",
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [newOption, setNewOption] = useState("");
  const buttonId = useId();
  const menuId = `${buttonId}-options`;
  const rootRef = useFloatingMenu(open, () => setOpen(false));

  function toggleValue(value: string) {
    onValuesChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function createOption() {
    const nextOption = newOption.trim();
    if (!nextOption || !onCreateOption) return;
    onCreateOption(nextOption);
    setNewOption("");
  }

  return (
    <div ref={rootRef} className={`jf-field jf-multiselect ${open ? "is-open" : ""} ${error ? "is-error" : ""} ${className}`}>
      <span className="jf-field__label">
        <b>{label}</b>
        {requiredLabel && <i>{requiredLabel}</i>}
      </span>
      <div className="jf-floating-field">
        <button
          id={buttonId}
          type="button"
          className="jf-control jf-multiselect__control"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={menuId}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "ArrowDown") setOpen(true);
          }}
        >
          {Icon && <Icon size={17} aria-hidden="true" />}
          <span className="jf-multiselect__value">
            {values.length ? (
              values.map((value) => {
                const option = options.find((item) => item.value === value);
                return <i key={value}>{option?.label ?? value}</i>;
              })
            ) : (
              <em>{placeholder}</em>
            )}
          </span>
          <ChevronDown size={17} aria-hidden="true" />
        </button>
        {open && (
          <div
            id={menuId}
            className="jf-multiselect__menu"
          >
            <div className="jf-multiselect__options" role="listbox" aria-multiselectable="true" aria-labelledby={buttonId}>
              {options.map((option) => {
                const selected = values.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => toggleValue(option.value)}
                  >
                    <span className="jf-choice-box">{selected && <Check size={13} aria-hidden="true" />}</span>
                    <span>
                      <strong>{option.label}</strong>
                      {option.description && <small>{option.description}</small>}
                    </span>
                  </button>
                );
              })}
            </div>
            {allowCreate && onCreateOption && (
              <div className="jf-create-option-shell">
                <div className="jf-create-option">
                  <input
                    type="text"
                    value={newOption}
                    placeholder={createPlaceholder}
                    aria-label={createPlaceholder}
                    onChange={(event) => setNewOption(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") { event.preventDefault(); createOption(); }
                      if (event.key === "Escape") setOpen(false);
                    }}
                  />
                  <button type="button" aria-label="Adicionar nova opção" disabled={!newOption.trim()} onClick={createOption}><Plus size={15} /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {(error || helpText) && <small className="jf-field__message">{error ?? helpText}</small>}
    </div>
  );
}

type FileUploadFieldProps = FieldBaseProps & {
  value: string | null;
  accept: string;
  emptyHint: string;
  variant?: "file" | "picture";
  onFileChange: (file: File | null) => void;
};

export function FileUploadField({
  label,
  value,
  accept,
  emptyHint,
  variant = "file",
  onFileChange,
  className = "",
}: FileUploadFieldProps) {
  const inputId = useId();
  const EmptyIcon = variant === "picture" ? ImagePlus : FileText;
  const FilledIcon = variant === "picture" ? FileImage : FileCheck2;
  const StateIcon = value ? FilledIcon : EmptyIcon;

  return (
    <label className={`jf-upload jf-upload--${variant} ${value ? "is-filled" : ""} ${className}`} htmlFor={inputId}>
      <input
        id={inputId}
        type="file"
        accept={accept}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onFileChange(event.target.files?.[0] ?? null)}
      />
      <span className="jf-upload__icon"><StateIcon size={21} aria-hidden="true" /></span>
      <span className="jf-upload__content">
        <strong>{label}</strong>
        <small title={value ?? undefined}>{value ?? emptyHint}</small>
      </span>
      <em>
        {value ? <Check size={15} aria-hidden="true" /> : <UploadCloud size={15} aria-hidden="true" />}
        {value ? "Trocar" : "Selecionar"}
      </em>
    </label>
  );
}

type MultiFileUploadFieldProps = FieldBaseProps & {
  files: File[];
  accept: string;
  emptyHint: string;
  variant?: "file" | "picture";
  maxFiles?: number;
  onFilesChange: (files: File[]) => void;
};

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileMatchesAccept(file: File, accept: string) {
  const rules = accept.split(",").map((rule) => rule.trim().toLowerCase()).filter(Boolean);
  if (!rules.length) return true;
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith(".")) return fileName.endsWith(rule);
    if (rule.endsWith("/*")) return fileType.startsWith(rule.slice(0, -1));
    return fileType === rule;
  });
}

function UploadImagePreview({ file }: { file: File }) {
  const [previewUrl] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);
  return <img src={previewUrl} alt={`Prévia de ${file.name}`} />;
}

export function MultiFileUploadField({
  label,
  helpText,
  error,
  requiredLabel,
  files,
  accept,
  emptyHint,
  variant = "file",
  maxFiles = 8,
  onFilesChange,
  className = "",
}: MultiFileUploadFieldProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const StateIcon = variant === "picture" ? Images : Files;
  const hasFiles = files.length > 0;

  function addFiles(nextFiles: File[]) {
    const knownFiles = new Set(files.map(fileKey));
    const acceptedFiles = nextFiles.filter((file) => fileMatchesAccept(file, accept) && !knownFiles.has(fileKey(file)));
    onFilesChange([...files, ...acceptedFiles].slice(0, maxFiles));
  }

  function removeFile(file: File) {
    const targetKey = fileKey(file);
    onFilesChange(files.filter((item) => fileKey(item) !== targetKey));
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <div className={`jf-multi-upload-field ${error ? "is-error" : ""} ${className}`}>
      <label className="jf-field__label" htmlFor={inputId}>
        <b>{label}</b>
        <i>{requiredLabel ?? `${files.length}/${maxFiles}`}</i>
      </label>
      <label
        className={`jf-multi-upload jf-multi-upload--${variant} ${hasFiles ? "is-filled" : ""} ${dragActive ? "is-dragging" : ""}`}
        htmlFor={inputId}
        onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple
          aria-describedby={helpText || error ? messageId : undefined}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <span className="jf-multi-upload__icon"><StateIcon size={22} aria-hidden="true" /></span>
        <span className="jf-multi-upload__content">
          <strong>{hasFiles ? `${files.length} ${files.length === 1 ? "item selecionado" : "itens selecionados"}` : variant === "picture" ? "Adicione suas imagens" : "Adicione seus arquivos"}</strong>
          <small>{hasFiles ? `Você ainda pode adicionar ${Math.max(0, maxFiles - files.length)} item(ns).` : emptyHint}</small>
        </span>
        <em><UploadCloud size={15} aria-hidden="true" />{hasFiles ? "Adicionar" : "Selecionar"}</em>
      </label>
      {hasFiles && variant === "file" && (
        <div className="jf-multi-upload__list" aria-label="Arquivos selecionados">
          {files.map((file) => (
            <div key={fileKey(file)}>
              <span><FileCheck2 size={17} aria-hidden="true" /></span>
              <div><strong title={file.name}>{file.name}</strong><small>{formatFileSize(file.size)}</small></div>
              <button type="button" aria-label={`Remover ${file.name}`} onClick={() => removeFile(file)}><X size={15} aria-hidden="true" /></button>
            </div>
          ))}
        </div>
      )}
      {hasFiles && variant === "picture" && (
        <div className="jf-multi-upload__gallery" aria-label="Imagens selecionadas">
          {files.map((file) => (
            <div key={fileKey(file)}>
              <UploadImagePreview file={file} />
              <span title={file.name}>{file.name}</span>
              <button type="button" aria-label={`Remover ${file.name}`} onClick={() => removeFile(file)}><X size={15} aria-hidden="true" /></button>
            </div>
          ))}
        </div>
      )}
      {(error || helpText) && <small id={messageId} className="jf-field__message">{error ?? helpText}</small>}
    </div>
  );
}

type ToggleSwitchProps = {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function ToggleSwitch({ label, description, checked, onCheckedChange, disabled = false }: ToggleSwitchProps) {
  return (
    <div className="jf-toggle-row">
      <div>
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </div>
      <button
        type="button"
        className={`jf-toggle ${checked ? "is-active" : ""}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

type ChoiceFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  label: ReactNode;
};

export function CheckboxField({ label, ...inputProps }: ChoiceFieldProps) {
  return (
    <label className="jf-choice">
      <input {...inputProps} type="checkbox" />
      <span className="jf-choice-box"><Check size={14} aria-hidden="true" /></span>
      {label}
    </label>
  );
}

export function RadioField({ label, ...inputProps }: ChoiceFieldProps) {
  return (
    <label className="jf-choice jf-choice--radio">
      <input {...inputProps} type="radio" />
      <span className="jf-choice-box" />
      {label}
    </label>
  );
}

type RichTextFieldProps = {
  label: string;
  initialHtml: string;
  onChange?: (html: string) => void;
};

export function RichTextField({ label, initialHtml, onChange }: RichTextFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  function format(command: "bold" | "italic" | "insertUnorderedList" | "createLink") {
    editorRef.current?.focus();
    if (command === "createLink") document.execCommand(command, false, "https://jobforged.com");
    else document.execCommand(command);
    if (editorRef.current) onChange?.(editorRef.current.innerHTML);
  }

  return (
    <div className="jf-rich-text">
      <span className="jf-visually-hidden">{label}</span>
      <div className="jf-rich-text__toolbar" role="toolbar" aria-label="Formatação de texto">
        <button type="button" aria-label="Negrito" onMouseDown={(event) => { event.preventDefault(); format("bold"); }}><Bold size={15} /></button>
        <button type="button" aria-label="Itálico" onMouseDown={(event) => { event.preventDefault(); format("italic"); }}><Italic size={15} /></button>
        <button type="button" aria-label="Lista" onMouseDown={(event) => { event.preventDefault(); format("insertUnorderedList"); }}><List size={15} /></button>
        <button type="button" aria-label="Adicionar link" onMouseDown={(event) => { event.preventDefault(); format("createLink"); }}><Link2 size={15} /></button>
      </div>
      <div
        ref={editorRef}
        className="jf-rich-text__editor"
        role="textbox"
        aria-label={label}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: initialHtml }}
        onInput={(event) => onChange?.(event.currentTarget.innerHTML)}
      />
    </div>
  );
}
