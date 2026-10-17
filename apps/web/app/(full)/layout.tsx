/** Pages read on a full screen or printed: the statement, the loan pack and the judges' screen. */
export default function FullLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-full bg-surface">{children}</div>;
}
