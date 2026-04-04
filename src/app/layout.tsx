import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fielum — Field Service Scheduler",
  description: "Multi-tenant Field Service Management SaaS",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
