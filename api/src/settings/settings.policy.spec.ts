import { BadRequestException } from '@nestjs/common';
import { isSecretSettingKey, redactSecretSettings, validateSettingsPayload } from './settings.policy';

describe('settings.policy', () => {
    it('detecta claves secretas y las oculta', () => {
        expect(isSecretSettingKey('pitayacore_api_key')).toBe(true);
        expect(isSecretSettingKey('flow_internal_key')).toBe(true);
        expect(isSecretSettingKey('business_name')).toBe(false);
        expect(redactSecretSettings({ business_name: 'CARED', pitayacore_api_key: 'x' })).toEqual({ business_name: 'CARED' });
    });

    it('acepta ajustes validos y convierte numeros y booleanos a texto', () => {
        expect(validateSettingsPayload({ business_name: 'CARED', tax: 16, enable_x: true, note: null }))
            .toEqual({ business_name: 'CARED', tax: '16', enable_x: 'true', note: '' });
    });

    it('acepta URLs http/https y rechaza esquemas peligrosos, credenciales y metadata', () => {
        expect(() => validateSettingsPayload({ flow_api_url: 'https://flow-api.pitayacode.io' })).not.toThrow();
        expect(() => validateSettingsPayload({ flow_api_url: 'http://pitayacore-api:3000/api' })).not.toThrow();
        expect(() => validateSettingsPayload({ flow_api_url: 'file:///etc/passwd' })).toThrow(BadRequestException);
        expect(() => validateSettingsPayload({ flow_api_url: 'https://user:pass@host.com' })).toThrow(BadRequestException);
        expect(() => validateSettingsPayload({ flow_api_url: 'http://169.254.169.254/latest' })).toThrow(BadRequestException);
        expect(() => validateSettingsPayload({ flow_api_url: 'no-url' })).toThrow(BadRequestException);
    });

    it('rechaza cuerpos y llaves invalidas', () => {
        expect(() => validateSettingsPayload(null)).toThrow(BadRequestException);
        expect(() => validateSettingsPayload([1])).toThrow(BadRequestException);
        expect(() => validateSettingsPayload({ 'mala llave': 'x' })).toThrow(BadRequestException);
        expect(() => validateSettingsPayload({ a: { b: 1 } })).toThrow(BadRequestException);
    });
});
