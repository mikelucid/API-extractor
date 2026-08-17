/**
 * Explicit non-implementation of the PDF torrent/DHT decentral layer.
 * Rootv2 stays local-only by default (constitution network_peer deny).
 */
export const DECENTRAL_TRANSFER = {
  torrent: false,
  dht: false,
  peerRecognition: false,
  advertising: false,
  /** Only owner-allowlisted local peers may ever be considered later. */
  allowlistedLocalPeersOnly: true,
} as const;

export function assertNoPublicDecentralTransfer(): void {
  if (DECENTRAL_TRANSFER.torrent || DECENTRAL_TRANSFER.dht) {
    throw new Error("Public torrent/DHT transfer is forbidden in Rootv2 defaults");
  }
}
