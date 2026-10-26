import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IdentityVerificationService,
  VerificationSessionStatus,
} from './identity-verification.service';
import {
  IdentityDocumentType,
  VerificationProviderType,
} from './dto/request-verification.dto';
import { HostVerificationStatus } from '../../users/entities/host-profile.entity';

describe('IdentityVerificationService', () => {
  let service: IdentityVerificationService;
  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'IDENTITY_PROVIDER_WEBHOOK_SECRET') {
        return 'test-webhook-secret-key';
      }
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityVerificationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<IdentityVerificationService>(IdentityVerificationService);
  });

  describe('Document Types and Configuration', () => {
    it('returns all supported Ethiopian and international document types', () => {
      const docTypes = service.getSupportedDocumentTypes();
      expect(docTypes.length).toBe(6);
      expect(docTypes.map((d) => d.type)).toEqual(
        expect.arrayContaining([
          IdentityDocumentType.ETHIOPIAN_KEBELE_ID,
          IdentityDocumentType.ETHIOPIAN_FAYDA_ID,
          IdentityDocumentType.ETHIOPIAN_PASSPORT,
          IdentityDocumentType.ETHIOPIAN_DRIVERS_LICENSE,
          IdentityDocumentType.FOREIGN_PASSPORT,
          IdentityDocumentType.RESIDENCE_PERMIT,
        ]),
      );
    });

    it('returns supported countries including Ethiopia and international list', () => {
      const countries = service.getSupportedCountries();
      expect(countries.some((c) => c.code === 'ET')).toBe(true);
      expect(countries.some((c) => c.code === 'US')).toBe(true);
      expect(countries.some((c) => c.code === 'GB')).toBe(true);
    });

    it('returns full configuration and privacy policy metadata', () => {
      const config = service.getVerificationConfig();
      expect(config.supportedDocuments).toBeDefined();
      expect(config.supportedCountries).toBeDefined();
      expect(config.dataRetentionPolicy.fullIdNumbersStored).toBe(false);
      expect(config.dataRetentionPolicy.rawIdImagesRetained).toBe(false);
    });
  });

  describe('Document and Provider Compatibility Validation', () => {
    it('[positive] validates Ethiopian Fayda ID with Ethiopia and FAYDA_NIDP provider', () => {
      const doc = service.validateDocumentAndProvider(
        IdentityDocumentType.ETHIOPIAN_FAYDA_ID,
        'ET',
        VerificationProviderType.FAYDA_NIDP,
      );
      expect(doc.type).toBe(IdentityDocumentType.ETHIOPIAN_FAYDA_ID);
    });

    it('[positive] validates Foreign Passport with international issuing country and Persona', () => {
      const doc = service.validateDocumentAndProvider(
        IdentityDocumentType.FOREIGN_PASSPORT,
        'US',
        VerificationProviderType.PERSONA,
      );
      expect(doc.type).toBe(IdentityDocumentType.FOREIGN_PASSPORT);
    });

    it('[positive] validates Ethiopian Kebele ID with Ethiopia and manual admin review', () => {
      const doc = service.validateDocumentAndProvider(
        IdentityDocumentType.ETHIOPIAN_KEBELE_ID,
        'ET',
        VerificationProviderType.MANUAL_ADMIN_REVIEW,
      );
      expect(doc.type).toBe(IdentityDocumentType.ETHIOPIAN_KEBELE_ID);
    });

    it('[negative] rejects Ethiopian Kebele ID if issuing country is not Ethiopia', () => {
      expect(() =>
        service.validateDocumentAndProvider(
          IdentityDocumentType.ETHIOPIAN_KEBELE_ID,
          'US',
          VerificationProviderType.MANUAL_ADMIN_REVIEW,
        ),
      ).toThrow(BadRequestException);
    });

    it('[negative] clearly communicates when selected provider does not support the document type', () => {
      expect(() =>
        service.validateDocumentAndProvider(
          IdentityDocumentType.FOREIGN_PASSPORT,
          'US',
          VerificationProviderType.FAYDA_NIDP,
        ),
      ).toThrow(
        /Identity verification provider "FAYDA_NIDP" does not support document type/,
      );
    });

    it('[negative] clearly communicates when Persona is selected for Kebele ID', () => {
      expect(() =>
        service.validateDocumentAndProvider(
          IdentityDocumentType.ETHIOPIAN_KEBELE_ID,
          'ET',
          VerificationProviderType.PERSONA,
        ),
      ).toThrow(
        /Identity verification provider "PERSONA" does not support document type/,
      );
    });
  });

  describe('Session Initiation & Privacy Protection', () => {
    it('initiates session with masked document number, hash, and PENDING status', () => {
      const record = service.initiateVerificationSession('user-123', 'profile-123', {
        documentType: IdentityDocumentType.ETHIOPIAN_FAYDA_ID,
        issuingCountry: 'ET',
        documentNumber: 'FAN-9876543210',
        issuingAuthority: 'NIDP',
        verificationProvider: VerificationProviderType.FAYDA_NIDP,
      });

      expect(record.transactionId).toMatch(/^TX-/);
      expect(record.status).toBe(VerificationSessionStatus.PENDING);
      expect(record.maskedDocumentNumber).toMatch(/^\*+-3210$/);
      expect(record.maskedDocumentNumber).not.toContain('987654');
      expect(record.documentNumberHash).toHaveLength(64);
      expect(record.auditTrail.length).toBe(1);
    });
  });

  describe('Provider Webhook Cryptographic Validation', () => {
    const secret = 'test-webhook-secret-key';
    const rawBody = JSON.stringify({ event: 'verification.completed', id: 'tx-1' });

    it('[positive] successfully validates authentic HMAC-SHA256 signature within time window', () => {
      const timestamp = Date.now();
      const payloadToSign = `${timestamp}.${rawBody}`;
      const validSig = crypto
        .createHmac('sha256', secret)
        .update(payloadToSign)
        .digest('hex');

      const isValid = service.validateProviderWebhookSignature(
        rawBody,
        validSig,
        timestamp,
        secret,
      );
      expect(isValid).toBe(true);
    });

    it('[negative] throws UnauthorizedException if signature is missing or altered', () => {
      const timestamp = Date.now();
      expect(() =>
        service.validateProviderWebhookSignature(rawBody, 'invalid-hex-sig', timestamp, secret),
      ).toThrow(UnauthorizedException);
    });

    it('[negative] throws UnauthorizedException if webhook timestamp is older than 5 minutes', () => {
      const staleTimestamp = Date.now() - 301000; // 5 min + 1 sec
      const payloadToSign = `${staleTimestamp}.${rawBody}`;
      const validSig = crypto
        .createHmac('sha256', secret)
        .update(payloadToSign)
        .digest('hex');

      expect(() =>
        service.validateProviderWebhookSignature(rawBody, validSig, staleTimestamp, secret),
      ).toThrow(/expired or clock skew/);
    });
  });

  describe('Authoritative Provider Result Processing & Exception Workflow', () => {
    let transactionId: string;

    beforeEach(() => {
      const session = service.initiateVerificationSession('user-host-1', 'profile-host-1', {
        documentType: IdentityDocumentType.ETHIOPIAN_PASSPORT,
        issuingCountry: 'ET',
        documentNumber: 'EP-99887766',
        verificationProvider: VerificationProviderType.SMILE_IDENTITY,
      });
      transactionId = session.transactionId;
    });

    it('[positive] marks session VERIFIED only when authenticity, face match, and liveness all pass', () => {
      const result = service.processProviderResult({
        transactionId,
        documentAuthentic: true,
        faceMatchScore: 94.5,
        faceMatchPassed: true,
        livenessVerified: true,
      });

      expect(result.verified).toBe(true);
      expect(result.status).toBe(HostVerificationStatus.VERIFIED);
      expect(result.exceptionWorkflow).toBe(false);
      expect(result.record.status).toBe(VerificationSessionStatus.VERIFIED);
      expect(result.record.verifiedAt).toBeDefined();
    });

    it('[negative/exception] routes to exception workflow if document authenticity fails', () => {
      const result = service.processProviderResult({
        transactionId,
        documentAuthentic: false,
        faceMatchScore: 92.0,
        livenessVerified: true,
        failureReason: 'Document hologram missing or altered.',
      });

      expect(result.verified).toBe(false);
      expect(result.status).toBe(HostVerificationStatus.PENDING);
      expect(result.exceptionWorkflow).toBe(true);
      expect(result.canRetry).toBe(true);
      expect(result.record.status).toBe(VerificationSessionStatus.INCONCLUSIVE);
      expect(result.record.requiresExceptionReview).toBe(true);
    });

    it('[negative/exception] routes to exception workflow if face match confidence is below 80%', () => {
      const result = service.processProviderResult({
        transactionId,
        documentAuthentic: true,
        faceMatchScore: 68.2, // Below 80% threshold
        faceMatchPassed: false,
        livenessVerified: true,
      });

      expect(result.verified).toBe(false);
      expect(result.status).toBe(HostVerificationStatus.PENDING);
      expect(result.exceptionWorkflow).toBe(true);
      expect(result.canRetry).toBe(true);
    });

    it('[negative/exception] routes to exception workflow if liveness check fails', () => {
      const result = service.processProviderResult({
        transactionId,
        documentAuthentic: true,
        faceMatchScore: 95.0,
        livenessVerified: false,
        failureReason: 'Spoof detected: printed photo presented instead of live face.',
      });

      expect(result.verified).toBe(false);
      expect(result.status).toBe(HostVerificationStatus.PENDING);
      expect(result.exceptionWorkflow).toBe(true);
    });

    it('[negative] throws NotFoundException for nonexistent transaction ID', () => {
      expect(() =>
        service.processProviderResult({
          transactionId: 'TX-NONEXISTENT',
          documentAuthentic: true,
        }),
      ).toThrow(NotFoundException);
    });
  });

  describe('Audit Trail & Admin Decisions', () => {
    it('records admin approval in the audit trail', () => {
      const session = service.initiateVerificationSession('user-host-2', 'profile-host-2', {
        documentType: IdentityDocumentType.ETHIOPIAN_KEBELE_ID,
        issuingCountry: 'ET',
        documentNumber: 'KBL-12345678',
        verificationProvider: VerificationProviderType.MANUAL_ADMIN_REVIEW,
      });

      service.recordAdminDecision('user-host-2', 'APPROVED', 'admin-uuid-1', 'Documents verified manually');

      const audit = service.getVerificationAudit('user-host-2');
      expect(audit).toBeDefined();
      expect(audit?.status).toBe(VerificationSessionStatus.VERIFIED);
      expect(audit?.auditTrail.some((e) => e.action === 'ADMIN_APPROVED')).toBe(true);
    });
  });

  describe('Fayda NIDP Digital Identity Extraction', () => {
    it('[positive] successfully validates format and generates cryptographic token for a 12-digit FIN', async () => {
      const record = await service.lookupFaydaRecord({
        faydaNumber: '1029 3847 5610',
        fullName: 'Abebe Bikila',
      });

      expect(record.fin).toBe('1029 3847 5610');
      expect(record.rawNumber).toBe('102938475610');
      expect(record.fullName).toBe('Abebe Bikila');
      expect(record.nationality).toBe('Ethiopian');
      expect(record.status).toBe('FORMAT_VALIDATED');
      expect(record.verificationToken).toContain('NIDP-VAL-');
      expect(record.provider).toBe('FAYDA_NIDP');
      expect(record.isLiveNidpExtract).toBe(false);
    });

    it('[positive] accepts 16-digit FAN and formats appropriately', async () => {
      const record = await service.lookupFaydaRecord({
        faydaNumber: '1029 3847 5610 9821',
      });

      expect(record.fan).toBe('1029 3847 5610 9821');
      expect(record.fin).toBe('1029 3847 5610');
      expect(record.status).toBe('FORMAT_VALIDATED');
    });

    it('[negative] rejects invalid Fayda number length', async () => {
      await expect(
        service.lookupFaydaRecord({
          faydaNumber: '12345',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
