import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Paytm's request signature, following its official PaytmChecksum library
// (github.com/paytm/Paytm_Node_Checksum): SHA-256 of "<data>|<salt>" with the salt appended,
// encrypted with AES-128-CBC under the merchant key and Paytm's fixed IV, then base64.
// The random 4-character salt makes every signature different; the receiver decrypts,
// reads the salt from the end and recomputes the hash.
const IV = "@@@@&&&&####$$$$";

function hashWithSalt(data: string, salt: string): string {
  return createHash("sha256").update(`${data}|${salt}`).digest("hex") + salt;
}

export function signPaytm(data: string, merchantKey: string): string {
  const salt = randomBytes(3).toString("base64");
  const cipher = createCipheriv("aes-128-cbc", merchantKey, IV);
  return cipher.update(hashWithSalt(data, salt), "utf8", "base64") + cipher.final("base64");
}

export function verifyPaytm(data: string, merchantKey: string, signature: string): boolean {
  try {
    const decipher = createDecipheriv("aes-128-cbc", merchantKey, IV);
    const hash = decipher.update(signature, "base64", "utf8") + decipher.final("utf8");
    return hash === hashWithSalt(data, hash.slice(-4));
  } catch {
    // A signature that does not decrypt under this key was not made with it.
    return false;
  }
}
