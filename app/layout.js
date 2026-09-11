import "./globals.css";
import PwaRegister from "../components/PwaRegister";

export const metadata = {
  title: "SJ INFO BUSINESS SOLUTIONS",
  applicationName: "SJ INFO BUSINESS SOLUTIONS",
  description: "SJ INFO BUSINESS SOLUTIONS learning, communication and business management platform.",
  manifest: "/manifest.json",
  openGraph: {
    title: "SJ INFO BUSINESS SOLUTIONS",
    description: "Learning, communication and business management platform.",
    siteName: "SJ INFO BUSINESS SOLUTIONS",
    type: "website"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SJ INFO BUSINESS SOLUTIONS"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A6ED1"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
