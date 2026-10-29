import { SuppliersPage } from "@/components/modules/stock-suppliers";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <SuppliersPage id={id}/>;}
