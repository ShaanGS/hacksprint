"use client";

import { Camera, ImageIcon, LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import { BillCheck, canConfirm, checkedTotal, type CheckLine } from "@/components/owner/bill-check";
import { BillResult } from "@/components/owner/bill-result";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { ProductPicker, type Pickable } from "@/components/owner/product-picker";
import { Art } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { FeatureCard } from "@/components/ui/feature-card";
import { Sheet } from "@/components/ui/sheet";
import { shrinkPhoto } from "@/lib/bills/photo";
import type { BillOutcome, ScannedBill } from "@/lib/bills/types";
import { formatMoney } from "@/lib/money";
import { ownerApi } from "@/lib/owner/api";

type Step =
  | { name: "closed" }
  | { name: "reading"; photoUrl: string }
  | { name: "unreadable" }
  | { name: "checking"; bill: ScannedBill; saving: boolean; failed: boolean }
  | { name: "done"; bill: ScannedBill; outcome: BillOutcome; distributor: string };

/**
 * B1, B4, C1: photograph today's bill, check its lines by tapping, and it goes into stock; then
 * see what did not come and what got dearer. Nothing changes until the owner says yes.
 */
export function BillScan({ products, onAdded }: { products: Pickable[]; onAdded: () => void }) {
  const { text } = useOwnerLanguage();
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>({ name: "closed" });
  const [lines, setLines] = useState<CheckLine[]>([]);
  const [distributorId, setDistributorId] = useState<string | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  // Closing the sheet while a photo is being read means the owner gave up on that photo.
  const attempt = useRef(0);

  async function read(file: File) {
    const mine = ++attempt.current;
    const photoUrl = URL.createObjectURL(file);
    setStep({ name: "reading", photoUrl });
    try {
      const bill = await ownerApi.scanBill(await shrinkPhoto(file));
      if (mine !== attempt.current) return;
      setLines(bill.lines.map((line) => ({ ...line, included: true })));
      setDistributorId(bill.distributorId);
      setStep({ name: "checking", bill, saving: false, failed: false });
    } catch {
      if (mine === attempt.current) setStep({ name: "unreadable" });
    } finally {
      URL.revokeObjectURL(photoUrl);
    }
  }

  async function confirm(bill: ScannedBill) {
    if (!distributorId) return;
    setStep({ name: "checking", bill, saving: true, failed: false });
    try {
      const going = lines.filter((line) => line.included);
      const outcome = await ownerApi.confirmBill(
        bill,
        distributorId,
        going.map((line) => ({
          productId: line.productId ?? "",
          qty: line.qty ?? 0,
          unitCostPaise: line.unitCostPaise ?? 0,
          mrpPaise: line.mrpPaise,
        })),
      );
      const distributor = bill.distributors.find((d) => d.id === distributorId)?.name ?? "";
      setStep({ name: "done", bill, outcome, distributor });
      onAdded();
    } catch {
      setStep({ name: "checking", bill, saving: false, failed: true });
    }
  }

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) read(file);
  }

  function change(index: number, update: Partial<CheckLine>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...update } : line)));
  }

  function close() {
    attempt.current += 1;
    setStep({ name: "closed" });
    setPicking(null);
  }

  return (
    <>
      <FeatureCard banner="bill" title={text.scanTitle} text={text.scanText}>
        <button
          type="button"
          onClick={() => camera.current?.click()}
          className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-surface text-base font-semibold text-ink transition-transform active:scale-98"
        >
          <Camera aria-hidden className="size-5" />
          {text.takePhoto}
        </button>
        <button
          type="button"
          onClick={() => gallery.current?.click()}
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-accent-ink"
        >
          <ImageIcon aria-hidden className="size-4" />
          {text.choosePhoto}
        </button>
      </FeatureCard>
      {/* The camera opens straight away; the second input picks a photo already taken. */}
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={pickPhoto}
      />
      <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />

      <Sheet
        open={step.name !== "closed"}
        onOpenChange={(open) => !open && close()}
        title={sheetTitle()}
        description={sheetDescription()}
        footer={footer()}
      >
        {body()}
      </Sheet>
    </>
  );

  function sheetTitle(): string {
    if (picking !== null) return text.whichProduct;
    if (step.name === "checking") return text.checkBill;
    if (step.name === "done") return text.addedTitle;
    return text.scanTitle;
  }

  function sheetDescription(): string | undefined {
    if (picking !== null) return text.onTheBill(lines[picking]?.printedName ?? "");
    if (step.name !== "checking" || !step.bill.distributorId) return undefined;
    const name = step.bill.distributors.find((d) => d.id === step.bill.distributorId)?.name;
    return text.billFrom(name ?? step.bill.printedDistributor, step.bill.billNumber);
  }

  function body() {
    if (step.name === "reading") {
      return (
        <div className="relative mx-auto mt-2 w-48 overflow-hidden rounded-2xl">
          <Image
            src={step.photoUrl}
            alt=""
            width={192}
            height={256}
            unoptimized
            className="h-auto w-full"
          />
          <div className="absolute inset-0 grid place-items-center bg-ink/40 text-accent-ink">
            <span className="flex flex-col items-center gap-2 text-sm font-semibold">
              <LoaderCircle aria-hidden className="size-8 animate-spin" />
              {text.readingBill}
            </span>
          </div>
        </div>
      );
    }
    if (step.name === "unreadable") {
      return (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Art name="bill" size={112} />
          <p className="text-base">{text.billUnreadable}</p>
        </div>
      );
    }
    if (step.name === "checking" && picking !== null) {
      return (
        <ProductPicker
          products={products}
          printedName={lines[picking]?.printedName ?? ""}
          onPick={(product) => {
            change(picking, { productId: product.id });
            setPicking(null);
          }}
        />
      );
    }
    if (step.name === "checking") {
      return (
        <BillCheck
          bill={step.bill}
          lines={lines}
          products={products}
          distributorId={distributorId}
          onDistributor={setDistributorId}
          onQty={(index, qty) => change(index, { qty })}
          onInclude={(index, included) => change(index, { included })}
          onPick={setPicking}
        />
      );
    }
    if (step.name === "done") {
      return <BillResult outcome={step.outcome} distributor={step.distributor} />;
    }
    return null;
  }

  function footer() {
    if (step.name === "unreadable") {
      return (
        <Button wide onClick={() => camera.current?.click()}>
          <Camera aria-hidden className="size-5" />
          {text.retakePhoto}
        </Button>
      );
    }
    if (step.name === "checking" && picking === null) {
      return (
        <>
          {step.failed && (
            <p role="alert" className="mb-3 text-center text-sm font-medium text-danger">
              {text.failed}
            </p>
          )}
          <Button
            wide
            disabled={step.saving || !canConfirm(step.bill, lines, distributorId)}
            onClick={() => confirm(step.bill)}
          >
            {text.addToStock(formatMoney(checkedTotal(lines)))}
          </Button>
        </>
      );
    }
    if (step.name === "done") {
      return (
        <Button wide onClick={close}>
          {text.done}
        </Button>
      );
    }
    return undefined;
  }
}
