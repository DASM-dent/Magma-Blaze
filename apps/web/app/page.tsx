import type { Metadata } from "next";
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: "Magma Blaze",
  description: "Lentes únicos que protegen tu vista y de edición limitada",
};

export default function HomePage() {
  return <HomeClient />;
}
