import type { FunctionDeclaration } from "@google/genai";

// The only way the model touches data (guardrail 1). Every parameter is a product code, a
// quantity or the customer's own words; prices, totals and stock counts never go either way.

const code = { type: "string", description: "A product code from the list" };
const qty = {
  type: "number",
  description: "Packs or pieces, or kilos or litres (0.5 is half a kilo)",
};
const nothing = { type: "object", properties: {} };

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "search_products",
    description:
      "Finds the shop's products by what the customer called them, in any language or spelling, and says whether each is in stock.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: 'What the customer said, like "oil" or "நல்லெண்ணெய்"',
        },
        qty: { ...qty, description: "How much the customer wants, if they said" },
      },
      required: ["query"],
    },
  },
  {
    name: "check_stock",
    description:
      "Says whether a product is in stock, and what the shop has instead if it is not. Adds nothing.",
    parametersJsonSchema: { type: "object", properties: { code }, required: ["code"] },
  },
  {
    name: "get_usual_order",
    description:
      'Puts the customer\'s usual basket in the order, for "the usual" or "same as last time", and says what it was.',
    parametersJsonSchema: nothing,
  },
  {
    name: "add_item",
    description: "Adds a product to the order. If it is already there, adds to its quantity.",
    parametersJsonSchema: { type: "object", properties: { code, qty }, required: ["code", "qty"] },
  },
  {
    name: "set_quantity",
    description: "Changes how much of a product is in the order. 0 takes it out.",
    parametersJsonSchema: { type: "object", properties: { code, qty }, required: ["code", "qty"] },
  },
  {
    name: "remove_item",
    description: "Takes a product out of the order.",
    parametersJsonSchema: { type: "object", properties: { code }, required: ["code"] },
  },
  {
    name: "get_order_summary",
    description:
      "Reads the whole order and its total back to the customer and shows it on their screen. Call it when they say that is all or ask for the total.",
    parametersJsonSchema: nothing,
  },
  {
    name: "submit_order",
    description:
      "Sends the order to the shop. Only after get_order_summary, once the customer says yes.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        payment_mode: {
          type: "string",
          enum: ["link", "credit"],
          description: '"credit" if they asked to put it on their account, otherwise "link"',
        },
      },
    },
  },
];
