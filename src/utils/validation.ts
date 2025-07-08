export function isValidAddress(input: string): boolean {
  if (!input.trim()) return false;
  const stripped = input.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const ipWithPort = /^(\d{1,3}\.){3}\d{1,3}:\d{2,5}$/;
  const localhostWithPort = /^localhost:\d{2,5}$/;
  const domainWithOptionalPort =
    /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d{2,5})?$/;

  return (
    ipWithPort.test(stripped) ||
    localhostWithPort.test(stripped) ||
    domainWithOptionalPort.test(stripped)
  );
}

export function looksLikeIpWithoutPort(input: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(input);
}

export function isValidMacAddress(input: string): boolean {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(input.trim());
}

export function getBroadcastAddress(address: string): string {
  // Remove protocol and port if present
  let ip = address.replace(/^https?:\/\//, "").split(":")[0];
  const parts = ip.split(".");
  if (parts.length === 4) {
    // IPv4
    return `${parts[0]}.${parts[1]}.${parts[2]}.255`;
  }
  return "255.255.255.255";
}