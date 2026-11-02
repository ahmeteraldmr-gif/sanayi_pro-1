"use client";

import { useRef, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CarFront, UserRound, Loader2 } from "lucide-react";
import { useDemo } from "@/components/app-shell/demo-provider";
import { Button } from "@/components/ui/button";
import {
  parseAndValidatePlate,
  parseAndValidatePhone,
  validateEmail,
  type Vehicle,
} from "@/lib/demo-data";

export function CreateRecordForm({
  initialPlate = "",
  customerId = "",
  allowSelectExistingCustomer = false,
  onCreated,
  onCancel,
}: {
  initialPlate?: string;
  customerId?: string;
  allowSelectExistingCustomer?: boolean;
  onCreated: (vehicle: Vehicle) => void;
  onCancel: () => void;
}) {
  const { customers, createRecord } = useDemo();
  const [selectedCustomer, setSelectedCustomer] = useState(customerId);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [plate, setPlate] = useState(initialPlate);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [fuelType, setFuelType] = useState("Dizel");

  const submitting = useRef(false);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field] && !prev.general) return prev;
      const next = { ...prev };
      delete next[field];
      delete next.general;
      return next;
    });
  };

  const handlePlateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawUpper = e.target.value.toUpperCase();
    const parsed = parseAndValidatePlate(rawUpper);
    if (parsed.valid && parsed.formatted) {
      setPlate(parsed.formatted);
    } else {
      setPlate(rawUpper);
    }
    clearFieldError("plate");
  };

  const handlePlateBlur = () => {
    if (plate.trim()) {
      const res = parseAndValidatePlate(plate);
      if (res.valid && res.formatted) {
        setPlate(res.formatted);
        clearFieldError("plate");
      }
    }
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseAndValidatePhone(raw);
    if (parsed.valid && parsed.formatted) {
      setPhone(parsed.formatted);
    } else {
      setPhone(raw);
    }
    clearFieldError("phone");
  };

  const handlePhoneBlur = () => {
    if (phone.trim()) {
      const res = parseAndValidatePhone(phone);
      if (res.valid && res.formatted) {
        setPhone(res.formatted);
        clearFieldError("phone");
      }
    }
  };

  const fillDemoValues = () => {
    setName("Test Ahmet Yılmaz");
    setPhone("0532 555 01 42");
    setEmail("test@example.com");
    setPlate("31 ABC 123");
    setBrand("BMW");
    setModel("320i");
    setYear("2015");
    setMileage("111000");
    setFuelType("Dizel");
    setFieldErrors({});
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;

    const errors: Record<string, string> = {};

    // 1. Müşteri bilgisi kontrolü
    if (!selectedCustomer) {
      if (!name.trim() || name.trim().length < 2) {
        errors.name = "Müşteri adı ve soyadını girin (en az 2 karakter).";
      }

      const phoneRes = parseAndValidatePhone(phone);
      if (!phoneRes.valid || !phoneRes.formatted) {
        errors.phone =
          phoneRes.error ||
          "Geçerli bir telefon numarası girin (Örn: 0532 555 01 42).";
      }

      const emailRes = validateEmail(email);
      if (!emailRes.valid) {
        errors.email =
          emailRes.error ||
          "Geçerli bir e-posta adresi girin (Örn: ornek@eposta.com).";
      }
    }

    // 2. Plaka kontrolü
    const plateRes = parseAndValidatePlate(plate);
    if (!plateRes.valid || !plateRes.formatted) {
      errors.plate =
        plateRes.error ||
        "Geçerli bir Türkiye plakası girin (Örn: 31 ABC 123, 01 AB 789).";
    }

    // 3. Yıl kontrolü (opsiyonel)
    if (year.trim()) {
      const parsedYear = Number(year);
      if (
        !Number.isInteger(parsedYear) ||
        parsedYear < 1950 ||
        parsedYear > 2027
      ) {
        errors.year = "Model yılı 1950–2027 arasında olmalıdır.";
      }
    }

    // 4. Kilometre kontrolü (opsiyonel)
    if (mileage.trim()) {
      const parsedMileage = Number(mileage);
      if (
        !Number.isFinite(parsedMileage) ||
        parsedMileage < 0 ||
        parsedMileage > 2000000
      ) {
        errors.mileage = "Kilometre 0 ile 2.000.000 arasında olmalıdır.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);

    const result = createRecord({
      customerId: selectedCustomer,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      plate: plateRes.formatted || plate.trim(),
      brand: brand.trim(),
      model: model.trim(),
      year: year.trim() ? Number(year) : null,
      mileage: mileage.trim() ? Number(mileage) : null,
      fuelType: fuelType || "Dizel",
    });

    if (result.error) {
      submitting.current = false;
      setIsSubmitting(false);

      if (result.field) {
        setFieldErrors({ [result.field]: result.error });
      } else if (result.error.toLowerCase().includes("plaka")) {
        setFieldErrors({ plate: result.error });
      } else if (result.error.toLowerCase().includes("telefon")) {
        setFieldErrors({ phone: result.error });
      } else if (result.error.toLowerCase().includes("posta")) {
        setFieldErrors({ email: result.error });
      } else {
        setFieldErrors({ general: result.error });
      }
      return;
    }

    if (result.vehicle) {
      onCreated(result.vehicle);
    }
  }

  return (
    <form className="records-form" onSubmit={submit} noValidate>
      <section>
        <h2>
          <UserRound size={19} /> MÜŞTERİ BİLGİLERİ
        </h2>
        {(allowSelectExistingCustomer || customerId) && (
          <label>
            Müşteri Seçimi
            <select
              value={selectedCustomer}
              onChange={(event) => {
                setSelectedCustomer(event.target.value);
                setFieldErrors({});
              }}
            >
              <option value="">Yeni müşteri oluştur</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} · {customer.phone}
                </option>
              ))}
            </select>
          </label>
        )}
        {!selectedCustomer ? (
          <div className="records-fields">
            <label>
              Ad Soyad
              <input
                name="name"
                autoComplete="off"
                required
                minLength={2}
                maxLength={100}
                placeholder="Örn. Ahmet Yılmaz"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearFieldError("name");
                }}
                className={fieldErrors.name ? "records-input-error" : ""}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && (
                <span className="records-field-error" role="alert">
                  {fieldErrors.name}
                </span>
              )}
            </label>
            <label>
              Telefon
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                maxLength={20}
                placeholder="05xx xxx xx xx"
                value={phone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                required
                className={fieldErrors.phone ? "records-input-error" : ""}
                aria-invalid={Boolean(fieldErrors.phone)}
              />
              {fieldErrors.phone && (
                <span className="records-field-error" role="alert">
                  {fieldErrors.phone}
                </span>
              )}
            </label>
            <label className="records-field-wide">
              E-posta <span className="ux-optional">Opsiyonel</span>
              <input
                name="email"
                type="email"
                inputMode="email"
                autoComplete="off"
                maxLength={120}
                placeholder="ornek@eposta.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                className={fieldErrors.email ? "records-input-error" : ""}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email && (
                <span className="records-field-error" role="alert">
                  {fieldErrors.email}
                </span>
              )}
            </label>
          </div>
        ) : (
          <p className="records-help">
            Araç seçili müşteriyle ilişkilendirilir. Müşteri kaydı tekrar
            oluşturulmaz.
          </p>
        )}
      </section>
      <section>
        <h2>
          <CarFront size={19} /> ARAÇ BİLGİLERİ
        </h2>
        <div className="records-fields">
          <label>
            Plaka
            <input
              name="plate"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              value={plate}
              onChange={handlePlateChange}
              onBlur={handlePlateBlur}
              required
              maxLength={14}
              autoComplete="off"
              placeholder="31 ABC 123"
              className={`records-plate-input ${fieldErrors.plate ? "records-input-error" : ""}`}
              aria-invalid={Boolean(fieldErrors.plate)}
            />
            {fieldErrors.plate && (
              <span className="records-field-error" role="alert">
                {fieldErrors.plate}
              </span>
            )}
          </label>
          <label>
            Marka
            <input
              name="brand"
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                clearFieldError("brand");
              }}
              maxLength={60}
              placeholder="Örn. Fiat, Renault, Ford, BMW"
            />
          </label>
          <label>
            Model
            <input
              name="model"
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                clearFieldError("model");
              }}
              maxLength={80}
              placeholder="Örn. Egea, Megane, 320i, Focus"
            />
          </label>
          <label>
            Yıl
            <input
              name="year"
              type="number"
              inputMode="numeric"
              min={1950}
              max={2027}
              placeholder="2021"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                clearFieldError("year");
              }}
              className={fieldErrors.year ? "records-input-error" : ""}
            />
            {fieldErrors.year && (
              <span className="records-field-error" role="alert">
                {fieldErrors.year}
              </span>
            )}
          </label>
          <label>
            Kilometre
            <input
              name="mileage"
              type="number"
              inputMode="numeric"
              min={0}
              max={2000000}
              placeholder="85200"
              value={mileage}
              onChange={(e) => {
                setMileage(e.target.value);
                clearFieldError("mileage");
              }}
              className={fieldErrors.mileage ? "records-input-error" : ""}
            />
            {fieldErrors.mileage && (
              <span className="records-field-error" role="alert">
                {fieldErrors.mileage}
              </span>
            )}
          </label>
          <label>
            Yakıt Türü
            <select
              name="fuelType"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
            >
              <option value="Dizel">Dizel</option>
              <option value="Benzin">Benzin</option>
              <option value="LPG">Benzin & LPG</option>
              <option value="Hibrit">Hibrit</option>
              <option value="Elektrik">Elektrik</option>
            </select>
          </label>
        </div>
      </section>

      {fieldErrors.general && (
        <p className="records-error" role="alert">
          {fieldErrors.general}
        </p>
      )}

      <div className="records-form-actions">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={fillDemoValues}
          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs font-semibold mr-auto"
        >
          ✨ Demo Bilgilerini Doldur
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Vazgeç
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          data-tour="customer-form-save"
          data-tour-id="customer-form-save"
        >
          {isSubmitting ? (
            <>
              Kaydediliyor... <Loader2 className="animate-spin ml-1" size={16} />
            </>
          ) : (
            <>
              Müşteri ve Aracı Kaydet <ArrowRight />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function NewRecordPage({ customerId = "" }: { customerId?: string }) {
  const router = useRouter();
  return (
    <>
      <Link className="records-back" href="/app/customers">
        <ArrowLeft size={16} /> Müşteri & Araçlar
      </Link>
      <div className="app-page-heading">
        <div>
          <p className="app-overline">MÜŞTERİ & ARAÇ KAYDI</p>
          <h1>Yeni Müşteri ve Araç</h1>
          <p>
            Müşteri ve araç bilgilerini tek formda kaydedin; ikinci bir sayfaya
            geçmenize gerek kalmadan kayıt tamamlanır.
          </p>
        </div>
      </div>
      <div className="app-panel records-form-panel">
        <CreateRecordForm
          customerId={customerId}
          allowSelectExistingCustomer={Boolean(customerId)}
          onCreated={(vehicle) =>
            router.push(
              `/app/customers/${vehicle.customerId}?vehicle=${vehicle.id}`,
            )
          }
          onCancel={() =>
            router.push(
              customerId ? `/app/customers/${customerId}` : "/app/customers",
            )
          }
        />
      </div>
    </>
  );
}
