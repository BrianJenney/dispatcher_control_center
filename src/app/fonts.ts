import { Cormorant_Garamond, Geist } from "next/font/google";

export const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["600"], variable: "--font-display" });
