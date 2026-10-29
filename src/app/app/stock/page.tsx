import { StockPage } from "@/components/modules/stock-suppliers";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <StockPage initialTab={tab as "parts" | "movements" | "suppliers"} />;
}
