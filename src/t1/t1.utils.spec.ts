import { formatT1CreateGuideResponse } from './t1.utils';
import { T1ExternalCreateGuideResponse } from './t1.interface';
import { GlobalCreateGuideResponse } from '@/global.interface';

describe('T1 Utils', () => {
  describe('formatT1CreateGuideResponse', () => {
    it('should transform T1ExternalCreateGuideResponse to GlobalCreateGuideResponse', () => {
      const mockT1Response: T1ExternalCreateGuideResponse = {
        success: true,
        message: 'Guide created successfully',
        location: 'production',
        detail: {
          paquetes: 1,
          num_orden: 'ORDER-123456',
          paqueteria: 'T1Express',
          fecha_creacion: '2024-10-05',
          costo: 150.75,
          destino: 'Mexico City',
          guia: 'TRACK-789012',
          file: 'guide-label.pdf',
          link_guia: 'https://t1.com/track/TRACK-789012',
        },
      };

      const expectedGlobalResponse: GlobalCreateGuideResponse = {
        trackingNumber: 'TRACK-789012',
        carrier: 'T1Express',
        price: '150.75',
        guideLink: 'https://t1.com/track/TRACK-789012',
        labelUrl: 'https://t1.com/track/TRACK-789012',
        file: 'guide-label.pdf',
      };

      const result = formatT1CreateGuideResponse(mockT1Response);

      expect(result).toEqual(expectedGlobalResponse);
    });

    it('should handle numeric cost conversion to string', () => {
      const mockT1Response: T1ExternalCreateGuideResponse = {
        success: true,
        message: 'Guide created',
        location: 'test',
        detail: {
          paquetes: 1,
          num_orden: 'ORDER-789',
          paqueteria: 'DHL',
          fecha_creacion: '2024-10-05',
          costo: 99.99,
          destino: 'Guadalajara',
          guia: 'DHL-123',
          file: 'label.pdf',
          link_guia: 'https://dhl.com/track/DHL-123',
        },
      };

      const result = formatT1CreateGuideResponse(mockT1Response);

      expect(result.price).toBe('99.99');
      expect(typeof result.price).toBe('string');
    });

    it('should map same link for both guideLink and labelUrl', () => {
      const mockT1Response: T1ExternalCreateGuideResponse = {
        success: true,
        message: 'Guide created',
        location: 'test',
        detail: {
          paquetes: 1,
          num_orden: 'ORDER-111',
          paqueteria: 'Fedex',
          fecha_creacion: '2024-10-05',
          costo: 200,
          destino: 'Monterrey',
          guia: 'FEDEX-456',
          file: 'fedex-label.pdf',
          link_guia: 'https://fedex.com/tracking/FEDEX-456',
        },
      };

      const result = formatT1CreateGuideResponse(mockT1Response);

      expect(result.guideLink).toBe('https://fedex.com/tracking/FEDEX-456');
      expect(result.labelUrl).toBe('https://fedex.com/tracking/FEDEX-456');
      expect(result.guideLink).toBe(result.labelUrl);
    });
  });
});
