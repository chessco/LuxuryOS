/**
 * Generates an unguessable 16-character tracking token for an order.
 */
export function getTrackToken(orderId: string): string {
    const secret = 'luxuryos_track_secure_token_secret_2026';
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    const str = `${secret}:${orderId}`;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    
    // Convert to 16-hex string
    const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
    const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
    return `${hex1}${hex2}`;
}
