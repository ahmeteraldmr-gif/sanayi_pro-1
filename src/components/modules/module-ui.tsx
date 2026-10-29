"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  value?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
};

export function EntryForm({
  title,
  fields,
  onSave,
  trigger,
  description = "Bilgileri tamamlayıp kaydedin.",
}: {
  title: string;
  fields: Field[];
  onSave: (data: Record<string, string>) => string | void;
  trigger?: ReactNode;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        saving.current = false;
        setOpen(value);
        setError("");
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus size={17} />
            {title}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="module-dialog">
          <div className="module-dialog-header">
            <p className="app-overline">KAYIT İŞLEMİ</p>
            <DialogTitle className="app-dialog-title">{title}</DialogTitle>
            <DialogDescription className="app-dialog-description">
              {description}
            </DialogDescription>
          </div>
          <form
            className="records-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (saving.current) return;
              const data = Object.fromEntries(
                new FormData(event.currentTarget).entries(),
              ) as Record<string, string>;
              const message = onSave(data);
              if (message) {
                setError(message);
                return;
              }
              saving.current = true;
              setOpen(false);
            }}
          >
            {fields.map((field) => (
              <label key={field.name}>
                <span>
                  {field.label}
                  {field.required && <em className="module-required">*</em>}
                </span>
                {field.options ? (
                  <select
                    name={field.name}
                    required={field.required}
                    defaultValue={field.value ?? ""}
                  >
                    {!field.value && <option value="">Seçin</option>}
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.name}
                    type={field.type ?? "text"}
                    required={field.required}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    placeholder={field.placeholder}
                    maxLength={field.type === "number" ? undefined : 250}
                    defaultValue={field.value ?? ""}
                  />
                )}
              </label>
            ))}
            {error && (
              <p className="records-error" role="alert">
                {error}
              </p>
            )}
            <div className="module-dialog-actions">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  İptal
                </Button>
              </DialogClose>
              <Button type="submit">Kaydet</Button>
            </div>
          </form>
        </DialogContent>
    </Dialog>
  );
}

export function ModuleHeading({
  title,
  subtitle,
  overline = "SERVİS YÖNETİMİ",
  action,
  back,
}: {
  title: string;
  subtitle?: string;
  overline?: string;
  action?: ReactNode;
  back?: string;
}) {
  return (
    <div className="app-page-heading">
      <div>
        {back && (
          <Link className="module-back" href={back}>
            <ArrowLeft size={15} />
            Listeye dön
          </Link>
        )}
        <p className="app-overline">{overline}</p>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export type SummaryItem = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
};

export function Summary({ items }: { items: SummaryItem[] }) {
  return (
    <div className="module-summary">
      {items.map((item) => (
        <div
          key={item.label}
          className={`module-summary-card ${item.tone ? `is-${item.tone}` : ""}`}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.hint && <small>{item.hint}</small>}
        </div>
      ))}
    </div>
  );
}

export function Filter({
  value,
  onChange,
  placeholder = "Ara",
  extra,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  extra?: ReactNode;
}) {
  if (extra) {
    return (
      <div className="module-toolbar">
        <label className="module-filter">
          <Search size={17} />
          <input
            aria-label={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        </label>
        <div className="module-toolbar-extra">{extra}</div>
      </div>
    );
  }
  return (
    <label className="module-filter">
      <Search size={17} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function Rows({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="app-panel module-table">
      <div
        className="module-columns"
        style={{ gridTemplateColumns: `repeat(${headers.length},minmax(0,1fr))` }}
      >
        {headers.map((header) => (
          <span key={header}>{header}</span>
        ))}
      </div>
      {empty ? <p className="module-empty">Kayıt bulunamadı.</p> : children}
    </div>
  );
}

export function Row({
  cells,
  href,
}: {
  cells: { label: string; value: ReactNode }[];
  href?: string;
}) {
  const content = cells.map((cell, index) => (
    <div key={cell.label} className={index === 0 ? "module-primary" : ""}>
      <span className="module-cell-label">{cell.label}</span>
      {cell.value}
    </div>
  ));
  return href ? (
    <Link
      href={href}
      className="module-row is-clickable"
      style={{ gridTemplateColumns: `repeat(${cells.length},minmax(0,1fr))` }}
    >
      {content}
    </Link>
  ) : (
    <div
      className="module-row"
      style={{ gridTemplateColumns: `repeat(${cells.length},minmax(0,1fr))` }}
    >
      {content}
    </div>
  );
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="module-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item}
          role="tab"
          aria-selected={item === value}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function Missing({ back }: { back: string }) {
  return (
    <>
      <ModuleHeading title="Kayıt bulunamadı" back={back} />
      <p>Listeden başka bir kayıt seçin.</p>
    </>
  );
}

export function getInitials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "SP"
  );
}

const moduleDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
export function dateLabel(value: string) {
  return moduleDateFormatter.format(new Date(value));
}
