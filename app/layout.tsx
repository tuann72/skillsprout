import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CalendarSideBar } from "@/components/custom/CalendarSideBar";
import { AuthProvider } from "@/components/AuthProvider";
import { CalendarProvider } from "@/components/CalendarContext";
import { AuthButton } from "@/components/AuthButton";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillSprout",
  description: "From beginner to expert - one branch at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${rubik.variable} antialiased`}>
        <AuthProvider>
          <CalendarProvider>
            <SidebarProvider defaultOpen={false}>
              <CalendarSideBar />
              <main className="w-full relative">
                <div className="fixed top-4 right-4 z-50">
                  <AuthButton />
                </div>
                {children}
              </main>
            </SidebarProvider>
          </CalendarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
