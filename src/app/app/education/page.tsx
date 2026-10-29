import type { Metadata } from "next";
import { TrainingHub } from "@/components/training/training-hub";

export const metadata: Metadata = {
  title: "Eğitim Merkezi | SanayiPro 2.0",
  description:
    "Uygulamalı SanayiPro oto servis eğitim merkezi. 10 interaktif eğitim modülü ile sistemi baştan sona deneyimleyin.",
};

export default function EducationPage() {
  return <TrainingHub />;
}
