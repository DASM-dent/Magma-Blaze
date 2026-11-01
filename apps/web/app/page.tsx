import type { Metadata } from "next";
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: "Magma Blaze",
  description: "Descubre lentes, airpods y accesorios Magma Blaze: piezas para expresar tu estilo y llevarte una experiencia que quieras repetir.",
};

export default function HomePage() {
  return <HomeClient />;
}
