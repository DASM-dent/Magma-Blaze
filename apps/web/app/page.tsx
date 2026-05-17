import type { Metadata } from "next";
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: "Magma Blaze",
  description: "Magma Blaze combina protección visual, diseño deportivo y comodidad ligera para acompañarte en cada movimiento.",
};

export default function HomePage() {
  return <HomeClient />;
}
