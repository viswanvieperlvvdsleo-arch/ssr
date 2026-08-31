import "./globals.css";
import AIAssistant from "../components/AIAssistant";
import ScrollContactBar from "../components/ScrollContactBar";
import ServiceAuthGate from "../components/ServiceAuthGate";
import PwaRegister from "../components/PwaRegister";

import { CMSProvider } from "../components/CMSContext";
import EditorToolbar from "../components/EditorToolbar";

export const metadata = {
  title: "SSR – Business Solutions",
  description:
    "SSR Business Solutions – Premier IT Training, Staffing & Development. SAP Authorized Training Center, Visakhapatnam.",
  manifest: "/manifest.json"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CMSProvider>
          <EditorToolbar />
          {children}
          <AIAssistant />
          <ScrollContactBar />
          <ServiceAuthGate />
          <PwaRegister />
        </CMSProvider>
      </body>
    </html>
  );
}
