import { isOriginAllowed } from './cors';

describe('isOriginAllowed', () => {
    it('permite el origen de produccion y subdominios https de pitayacode.io', () => {
        expect(isOriginAllowed('https://luxuryos.pitayacode.io')).toBe(true);
        expect(isOriginAllowed('https://otro.pitayacode.io')).toBe(true);
    });
    it('permite peticiones sin origen', () => {
        expect(isOriginAllowed(undefined)).toBe(true);
    });
    it('rechaza http en subdominios, dominios parecidos y basura', () => {
        expect(isOriginAllowed('http://otro.pitayacode.io')).toBe(false);
        expect(isOriginAllowed('https://pitayacode.io.evil.com')).toBe(false);
        expect(isOriginAllowed('https://evilpitayacode.io')).toBe(false);
        expect(isOriginAllowed('https://evil.com')).toBe(false);
        expect(isOriginAllowed('no es una url')).toBe(false);
    });
});
