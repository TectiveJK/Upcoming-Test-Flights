type Base64Options = {
  alphabet?: "base64" | "base64url";
  omitPadding?: boolean;
};

function bytesToBinary(bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let index = 0; index < bytes.length; index += step) {
    binary += String.fromCharCode(...bytes.subarray(index, index + step));
  }
  return binary;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return btoa(bytesToBinary(bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function bytesFromBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toBase64(bytes: Uint8Array, options?: Base64Options): string {
  const encoded = btoa(bytesToBinary(bytes));
  if (options?.alphabet !== "base64url") return encoded;
  const url = encoded.replaceAll("+", "-").replaceAll("/", "_");
  return options.omitPadding ? url.replaceAll("=", "") : url;
}

type ByteArrayWithBase64 = Uint8Array & {
  toBase64?: (options?: Base64Options) => string;
};

type ByteArrayConstructorWithBase64 = Uint8ArrayConstructor & {
  fromBase64?: (value: string, options?: Base64Options) => Uint8Array;
};

const bytes = Uint8Array as ByteArrayConstructorWithBase64;
const prototype = Uint8Array.prototype as ByteArrayWithBase64;

if (typeof bytes.fromBase64 !== "function") {
  bytes.fromBase64 = (value: string, options?: Base64Options) => {
    if (options?.alphabet === "base64url") return bytesFromBase64Url(value);
    const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      out[index] = binary.charCodeAt(index);
    }
    return out;
  };
}

if (typeof prototype.toBase64 !== "function") {
  prototype.toBase64 = function toBase64Url(options?: Base64Options) {
    return toBase64(new Uint8Array(this.buffer, this.byteOffset, this.byteLength), options);
  };
}
