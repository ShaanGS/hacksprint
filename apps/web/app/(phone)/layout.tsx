import { AppFrame } from "@/components/app/app-frame";

/** The phone screens: full screen on a phone, inside a phone frame on a laptop or projector. */
export default function PhoneLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppFrame>{children}</AppFrame>;
}
