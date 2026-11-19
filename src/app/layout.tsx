import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"Nubian Kings",description:"Private Core-rules playtest prototype",robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}<Script src="https://auth.nilesouth.app/oauth/authorize?client-script=2" integrity="sha384-9dKzY0gaa8KRNNmekZGEprBP09dmol5MagbQaSbyBzvWbBc6kO2wp6EHAh8UsOz9" crossOrigin="anonymous" strategy="afterInteractive" /></body></html>}
