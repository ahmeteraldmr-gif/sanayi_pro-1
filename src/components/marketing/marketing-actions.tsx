"use client";
import { useState, type ReactNode } from "react";
import { ArrowRight, Menu } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog,DialogContent,DialogDescription,DialogTitle,DialogTrigger } from "@/components/ui/dialog";
import { navigation } from "@/lib/marketing-data";
import { Brand } from "./brand";
type Action="demo"|"login";
export function PreviewProvider({children}:{children:ReactNode}){return <>{children}</>;}
export function PreviewButton({action="demo",children,variant,size,className}:{action?:Action;children:ReactNode;variant?:"default"|"outline"|"ghost";size?:"default"|"sm"|"lg";className?:string}){return <Button asChild variant={variant} size={size} className={className}><Link href={action==="login"?"/login":"/#iletisim"}>{children}</Link></Button>;}
export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="mobile-menu-trigger"
          aria-label="Menüyü aç"
        >
          <Menu aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="mobile-nav-dialog">
        <DialogTitle>
          <Brand />
        </DialogTitle>
        <DialogDescription className="sr-only">
          SanayiPro sayfa menüsü
        </DialogDescription>
        <nav aria-label="Mobil ana menü">
          {navigation.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          ))}
        </nav>
        <Button asChild>
          <Link href="/#iletisim" onClick={() => setOpen(false)}>
            Bilgi Al <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
