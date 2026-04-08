import "./globals.css";

export const metadata = {
  title: "SSR – Business Solutions",
  description:
    "SSR Business Solutions – Premier IT Training, Staffing & Development. SAP Authorized Training Center, Visakhapatnam."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

