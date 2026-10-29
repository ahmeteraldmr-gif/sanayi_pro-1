"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalRepository } from "@/lib/local-repository";
import { type BranchId } from "@/lib/demo-data";
import { getBranchProfile, getBranchInitialData } from "@/lib/branch-profiles";

export type Employee = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  phone: string;
  email: string;
  branchId: BranchId;
  active: boolean;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
};

export type StockPart = {
  id: string;
  name: string;
  code: string;
  physical: number;
  reserved: number;
  minimum: number;
  price: number;
  cost: number;
  supplierId: string;
  branchId: BranchId;
};

export type StockMovement = {
  id: string;
  partId: string;
  amount: number;
  at: string;
  note: string;
  orderId?: string;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  at: string;
  branchId: BranchId;
  kind: "expense" | "refund";
  orderId?: string;
};

export type Operations = {
  employees: Employee[];
  suppliers: Supplier[];
  parts: StockPart[];
  movements: StockMovement[];
  expenses: Expense[];
  settings: Record<string, string>;
};

const initial: Operations = {
  employees: [
    {
      id: "mehmet",
      name: "Mehmet Usta",
      role: "Usta",
      specialty: "Motor & Mekanik",
      phone: "0532 410 20 30",
      email: "",
      branchId: "dortyol",
      active: true,
    },
    {
      id: "ali",
      name: "Ali Usta",
      role: "Usta",
      specialty: "Fren Sistemleri",
      phone: "0532 410 20 31",
      email: "",
      branchId: "dortyol",
      active: true,
    },
    {
      id: "ayse",
      name: "Ayşe Usta",
      role: "Usta",
      specialty: "Oto Elektrik",
      phone: "0532 410 20 32",
      email: "",
      branchId: "dortyol",
      active: true,
    },
    {
      id: "ahmet",
      name: "Ahmet",
      role: "İşletme Sahibi",
      specialty: "Servis yönetimi",
      phone: "",
      email: "",
      branchId: "iskenderun",
      active: true,
    },
  ],
  suppliers: [
    {
      id: "supplier-1",
      name: "Akdeniz Otomotiv",
      contact: "Murat Kaya",
      phone: "0326 712 24 24",
      email: "",
    },
    {
      id: "supplier-2",
      name: "Güney Yedek Parça",
      contact: "Selin Arslan",
      phone: "0326 614 10 10",
      email: "",
    },
  ],
  parts: [
    {
      id: "part-1",
      name: "Ön fren balatası",
      code: "BRK-04465",
      physical: 5,
      reserved: 4,
      minimum: 3,
      price: 1800,
      cost: 1100,
      supplierId: "supplier-1",
      branchId: "dortyol",
    },
    {
      id: "part-2",
      name: "Motor yağı 5W-30",
      code: "OIL-5W30",
      physical: 24,
      reserved: 4,
      minimum: 8,
      price: 650,
      cost: 380,
      supplierId: "supplier-2",
      branchId: "dortyol",
    },
    {
      id: "part-3",
      name: "Yağ filtresi",
      code: "FLT-15208",
      physical: 12,
      reserved: 2,
      minimum: 4,
      price: 420,
      cost: 220,
      supplierId: "supplier-1",
      branchId: "dortyol",
    },
    {
      id: "part-4",
      name: "Hava filtresi",
      code: "FLT-16546",
      physical: 8,
      reserved: 0,
      minimum: 3,
      price: 560,
      cost: 310,
      supplierId: "supplier-2",
      branchId: "iskenderun",
    },
  ],
  movements: [
    {
      id: "movement-1",
      partId: "part-1",
      amount: 5,
      at: "2026-10-21T08:00:00+03:00",
      note: "Stok açılışı",
    },
  ],
  expenses: [
    {
      id: "expense-1",
      title: "Atölye sarf malzemeleri",
      amount: 1250,
      at: "2026-10-21T09:00:00+03:00",
      branchId: "dortyol",
      kind: "expense",
    },
  ],
  settings: {
    business: "Sanayi Oto Servis",
    phone: "",
    address: "",
    dortyol: "Dörtyol Şubesi",
    iskenderun: "İskenderun Şubesi",
    currency: "TRY",
    minimum: "3",
    fuel: "25",
    notifications: "Açık",
    workflow: "Onay gerekli",
    userRole: "İşletme Sahibi",
    checklist: "Zorunlu",
    vat: "20",
  },
};

const Context = createContext<{
  data: Operations;
  update: (recipe: (state: Operations) => Operations) => void;
} | null>(null);

export function OperationsProvider({
  children,
  branchSlug,
}: {
  children: ReactNode;
  branchSlug?: string;
}) {
  const initialData = useMemo(() => {
    if (!branchSlug) return initial;
    const profile = getBranchProfile(branchSlug);
    const bData = getBranchInitialData(branchSlug);
    return {
      employees: [
        {
          id: "mehmet",
          name: profile.craftsmanTitle,
          role: "Usta",
          specialty: profile.name,
          phone: "0532 410 20 30",
          email: "",
          branchId: "dortyol" as BranchId,
          active: true,
        },
        {
          id: "ali",
          name: "Ali Kalfa",
          role: "Kalfa",
          specialty: profile.name,
          phone: "0532 410 20 31",
          email: "",
          branchId: "dortyol" as BranchId,
          active: true,
        },
        {
          id: "ahmet",
          name: "Ahmet",
          role: "İşletme Sahibi",
          specialty: "Servis yönetimi",
          phone: "",
          email: "",
          branchId: "iskenderun" as BranchId,
          active: true,
        },
      ],
      suppliers: bData.suppliers,
      parts: bData.parts,
      movements: bData.movements,
      expenses: bData.expenses,
      settings: {
        business: profile.businessName,
        phone: "0326 712 24 24",
        address: "Sanayi Sitesi 4. Blok No:12",
        dortyol: `${profile.name} Atölyesi`,
        iskenderun: "İskenderun Şubesi",
        currency: "TRY",
        minimum: "3",
        fuel: "25",
        notifications: "Açık",
        workflow: "Onay gerekli",
        userRole: "İşletme Sahibi",
        checklist: "Zorunlu",
        vat: "20",
        trade: profile.name,
        tradeId: profile.id,
      },
    };
  }, [branchSlug]);

  const storageKey = branchSlug ? `operations:${branchSlug}` : "operations";
  const [data, update] = useLocalRepository(storageKey, initialData);
  const value = useMemo(() => ({ data, update }), [data, update]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOperations() {
  const context = useContext(Context);
  if (!context) throw new Error("OperationsProvider required");
  return context;
}
