import "./globals.css";
import AIAssistant from "../components/AIAssistant";

export const metadata = {
  title: "SSR – Business Solutions",
  description:
    "SSR Business Solutions – Premier IT Training, Staffing & Development. SAP Authorized Training Center, Visakhapatnam."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <AIAssistant />
      </body>
    </html>
  );
}

