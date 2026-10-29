"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CarFront, UserRound } from "lucide-react";
import { useDemo } from "@/components/app-shell/demo-provider";
import { Button } from "@/components/ui/button";
import type { Vehicle } from "@/lib/demo-data";

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
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [plate, setPlate] = useState(initialPlate);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const submitting = useRef(false);

  const fillDemoValues = () => {
    setName("Mehmet Çetin");
    setPhone("0532 555 12 34");
    setEmail("mehmet.cetin@example.com");
    setPlate("34 ABC 789");
    setBrand("Volkswagen");
    setModel("Passat");
    setYear("2021");
    setMileage("48500");
    setError("");
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const values = new FormData(event.currentTarget);
    const result = createRecord({
      customerId: selectedCustomer,
      name: String(values.get("name") ?? name),
      phone: String(values.get("phone") ?? phone),
      email: String(values.get("email") ?? email),
      plate: String(values.get("plate") ?? plate),
      brand: String(values.get("brand") ?? brand),
      model: String(values.get("model") ?? model),
      year: values.get("year") ? Number(values.get("year")) : (year ? Number(year) : null),
      mileage: values.get("mileage") ? Number(values.get("mileage")) : (mileage ? Number(mileage) : null),
      fuelType: String(values.get("fuelType") ?? ""),
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.vehicle) {
      submitting.current = true;
      onCreated(result.vehicle);
    }
  }

  return (
    <form className="records-form" onSubmit={submit}>
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
                setError("");
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
                onChange={(e) => setName(e.target.value)}
              />
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
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="records-field-wide">
              E-posta <span className="ux-optional">Opsiyonel</span>
              <input
                name="email"
                type="email"
                autoComplete="off"
                maxLength={120}
                placeholder="ornek@eposta.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
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
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              required
              maxLength={14}
              autoComplete="off"
              placeholder="31 ABC 123"
              className="records-plate-input"
            />
          </label>
          <label>
            Marka
            <input
              name="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              maxLength={60}
              placeholder="Örn. Fiat, Renault, Ford"
            />
          </label>
          <label>
            Model
            <input
              name="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              maxLength={80}
              placeholder="Örn. Egea, Megane, Focus"
            />
          </label>
          <label>
            Yıl
            <input
              name="year"
              type="number"
              min={1950}
              max={2027}
              placeholder="2021"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </label>
          <label>
            Kilometre
            <input
              name="mileage"
              type="number"
              min={0}
              max={2000000}
              placeholder="85200"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
            />
          </label>
          <label>
            Yakıt Türü
            <select name="fuelType" defaultValue="Dizel">
              <option value="Dizel">Dizel</option>
              <option value="Benzin">Benzin</option>
              <option value="LPG">Benzin & LPG</option>
              <option value="Hibrit">Hibrit</option>
              <option value="Elektrik">Elektrik</option>
            </select>
          </label>
        </div>
      </section>

      {error && (
        <p className="records-error" role="alert">
          {error}
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
        <Button type="button" variant="outline" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button
          type="submit"
          data-tour="customer-form-save"
          data-tour-id="customer-form-save"
        >
          Müşteri ve Aracı Kaydet <ArrowRight />
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
