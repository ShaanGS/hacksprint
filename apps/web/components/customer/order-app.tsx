"use client";

import { useState } from "react";
import { OrderStatus } from "@/components/customer/order-status";
import { Talk } from "@/components/customer/talk";
import { Welcome, type Details } from "@/components/customer/welcome";
import type { CustomerBackend } from "@/lib/customer/backend";
import { previewCustomer } from "@/lib/preview/customer";

type Stage =
  | { name: "welcome" }
  | { name: "talk"; details: Details; backend: CustomerBackend }
  | { name: "status"; details: Details; backend: CustomerBackend; number: number };

/** The customer's whole visit: welcome, then the voice order, then the order's progress. */
export function OrderApp({ shopName }: { shopName: string }) {
  const [stage, setStage] = useState<Stage>({ name: "welcome" });

  function talk(details: Details) {
    setStage({ name: "talk", details, backend: previewCustomer(details.lang, details.name) });
  }

  if (stage.name === "welcome") return <Welcome shopName={shopName} onStart={talk} />;
  if (stage.name === "talk") {
    return (
      <Talk
        lang={stage.details.lang}
        shopName={shopName}
        backend={stage.backend}
        onSent={(number) => setStage({ ...stage, name: "status", number })}
      />
    );
  }
  return (
    <OrderStatus
      lang={stage.details.lang}
      shopName={shopName}
      backend={stage.backend}
      number={stage.number}
      onOrderAgain={() => talk(stage.details)}
    />
  );
}
