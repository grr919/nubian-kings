import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"Nubian Kings",description:"Private Core-rules playtest prototype",robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}<Script src="https://auth.nilesouth.app/oauth/authorize?client-script=1" integrity="sha384-l+gc59IEJPqluBS+IxHcF6o95lg8EzflBxTLyUUoWBPHOd/9JXOYREcn3w3MkpJP" crossOrigin="anonymous" strategy="afterInteractive" /></body></html>}
