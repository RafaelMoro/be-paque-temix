import { formatManuableCreateGuideResponse } from './manuable.utils';
import { ManuableGuide } from './manuable.interface';
import { GlobalCreateGuideResponse } from '@/global.interface';

describe('Manuable Utils', () => {
  describe('formatManuableCreateGuideResponse', () => {
    it('should transform ManuableGuide to GlobalCreateGuideResponse', () => {
      const mockManuableGuide: ManuableGuide = {
        token: 'mn-token-123456',
        tracking_number: 'MN789012345',
        carrier: 'FEDEX',
        tracking_status: null,
        price: '250.50',
        waybill: null,
        label_url: 'https://manuable.com/labels/MN789012345.pdf',
        cancellable: true,
        created_at: '2024-10-05T10:30:00Z',
        label_status: 'ready',
      };

      const expectedGlobalResponse: GlobalCreateGuideResponse = {
        trackingNumber: 'MN789012345',
        carrier: 'FEDEX',
        price: '250.50',
        guideLink: null,
        source: 'Mn',
        labelUrl: 'https://manuable.com/labels/MN789012345.pdf',
        file: null,
      };

      const result = formatManuableCreateGuideResponse(mockManuableGuide);

      expect(result).toEqual(expectedGlobalResponse);
    });

    it('should handle DHL carrier transformation', () => {
      const mockManuableGuide: ManuableGuide = {
        token: 'mn-token-654321',
        tracking_number: 'DHL123456789',
        carrier: 'DHL',
        tracking_status: null,
        price: '180.75',
        waybill: null,
        label_url: 'https://manuable.com/labels/DHL123456789.pdf',
        cancellable: false,
        created_at: '2024-10-05T15:45:00Z',
        label_status: 'processing',
      };

      const result = formatManuableCreateGuideResponse(mockManuableGuide);

      expect(result.carrier).toBe('DHL');
      expect(result.trackingNumber).toBe('DHL123456789');
      expect(result.price).toBe('180.75');
    });

    it('should use same label_url for both guideLink and labelUrl', () => {
      const mockManuableGuide: ManuableGuide = {
        token: 'mn-token-999888',
        tracking_number: 'FDX987654321',
        carrier: 'FEDEX',
        tracking_status: null,
        price: '320.00',
        waybill: null,
        label_url: 'https://manuable.com/download/FDX987654321',
        cancellable: true,
        created_at: '2024-10-05T12:00:00Z',
        label_status: 'ready',
      };

      const result = formatManuableCreateGuideResponse(mockManuableGuide);

      expect(result.guideLink).toBe(null);
      expect(result.labelUrl).toBe(
        'https://manuable.com/download/FDX987654321',
      );
    });

    it('should handle price as string correctly', () => {
      const mockManuableGuide: ManuableGuide = {
        token: 'mn-token-111222',
        tracking_number: 'TEST123',
        carrier: 'DHL',
        tracking_status: null,
        price: '99.99',
        waybill: null,
        label_url: 'https://manuable.com/labels/TEST123.pdf',
        cancellable: true,
        created_at: '2024-10-05T09:15:00Z',
        label_status: 'ready',
      };

      const result = formatManuableCreateGuideResponse(mockManuableGuide);

      expect(result.price).toBe('99.99');
      expect(typeof result.price).toBe('string');
    });

    it('should set file as null since Manuable does not provide file field', () => {
      const mockManuableGuide: ManuableGuide = {
        token: 'mn-token-333444',
        tracking_number: 'MN555666777',
        carrier: 'FEDEX',
        tracking_status: null,
        price: '150.25',
        waybill: null,
        label_url: 'https://manuable.com/labels/MN555666777.pdf',
        cancellable: false,
        created_at: '2024-10-05T14:20:00Z',
        label_status: 'ready',
      };

      const result = formatManuableCreateGuideResponse(mockManuableGuide);

      expect(result.file).toBe(null);
    });
  });
});
