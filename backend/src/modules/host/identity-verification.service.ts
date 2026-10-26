import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IdentityDocumentType,
  VerificationProviderType,
  RequestHostVerificationDto,
} from './dto/request-verification.dto';
import { HostVerificationStatus } from '../../users/entities/host-profile.entity';

export enum VerificationSessionStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  INCONCLUSIVE = 'INCONCLUSIVE',
  FAILED = 'FAILED',
}

export interface DocumentTypeDescriptor {
  type: IdentityDocumentType;
  label: string;
  description: string;
  requiresIssuingCountry: boolean;
  allowedIssuingCountries: string[]; // ['ET'] or ['*']
  supportedProviders: VerificationProviderType[];
  supportsBiometricFaceMatch: boolean;
  supportsLiveness: boolean;
}

export interface CountryDescriptor {
  code: string;
  name: string;
}

export interface VerificationAuditEntry {
  timestamp: string;
  action: string;
  actor: string;
  details?: string;
}

export interface VerificationAuditRecord {
  transactionId: string;
  userId: string;
  hostProfileId: string;
  provider: VerificationProviderType;
  documentType: IdentityDocumentType;
  issuingCountry: string;
  maskedDocumentNumber: string;
  documentNumberHash: string;
  issuingAuthority?: string;
  expirationDate?: string;
  status: VerificationSessionStatus;
  documentAuthentic?: boolean;
  faceMatchScore?: number;
  faceMatchPassed?: boolean;
  livenessVerified?: boolean;
  failureReason?: string;
  requiresExceptionReview?: boolean;
  canRetry?: boolean;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  auditTrail: VerificationAuditEntry[];
}

export interface ProviderVerificationResult {
  transactionId: string;
  documentAuthentic: boolean;
  faceMatchScore?: number;
  faceMatchPassed?: boolean;
  livenessVerified?: boolean;
  failureReason?: string;
  confidenceScore?: number;
}

@Injectable()
export class IdentityVerificationService {
  private readonly logger = new Logger(IdentityVerificationService.name);

  // In-memory audit & session store (keyed by transactionId and userId)
  private readonly auditRecords = new Map<string, VerificationAuditRecord>();
  private readonly userActiveSessions = new Map<string, string>(); // userId -> transactionId

  // Provider compatibility matrix
  private readonly providerCapabilities: Record<VerificationProviderType, IdentityDocumentType[]> = {
    [VerificationProviderType.FAYDA_NIDP]: [
      IdentityDocumentType.ETHIOPIAN_FAYDA_ID,
    ],
    [VerificationProviderType.SMILE_IDENTITY]: [
      IdentityDocumentType.ETHIOPIAN_FAYDA_ID,
      IdentityDocumentType.ETHIOPIAN_PASSPORT,
      IdentityDocumentType.ETHIOPIAN_DRIVERS_LICENSE,
      IdentityDocumentType.FOREIGN_PASSPORT,
    ],
    [VerificationProviderType.PERSONA]: [
      IdentityDocumentType.FOREIGN_PASSPORT,
      IdentityDocumentType.ETHIOPIAN_PASSPORT,
      IdentityDocumentType.ETHIOPIAN_DRIVERS_LICENSE,
    ],
    [VerificationProviderType.MANUAL_ADMIN_REVIEW]: [
      IdentityDocumentType.ETHIOPIAN_KEBELE_ID,
      IdentityDocumentType.ETHIOPIAN_FAYDA_ID,
      IdentityDocumentType.ETHIOPIAN_PASSPORT,
      IdentityDocumentType.ETHIOPIAN_DRIVERS_LICENSE,
      IdentityDocumentType.FOREIGN_PASSPORT,
      IdentityDocumentType.RESIDENCE_PERMIT,
    ],
  };

  // Supported document types definition
  private readonly supportedDocuments: DocumentTypeDescriptor[] = [
    {
      type: IdentityDocumentType.ETHIOPIAN_KEBELE_ID,
      label: 'Ethiopian Kebele Resident ID Card',
      description: 'Official resident identification card issued by local Kebele/Woreda administration.',
      requiresIssuingCountry: true,
      allowedIssuingCountries: ['ET', 'ETH', 'Ethiopia'],
      supportedProviders: [
        VerificationProviderType.MANUAL_ADMIN_REVIEW,
        VerificationProviderType.SMILE_IDENTITY,
      ],
      supportsBiometricFaceMatch: false,
      supportsLiveness: true,
    },
    {
      type: IdentityDocumentType.ETHIOPIAN_FAYDA_ID,
      label: 'National Fayda Digital ID (FIN / FAN)',
      description: 'National Identification Program digital ID card or verified registration number.',
      requiresIssuingCountry: true,
      allowedIssuingCountries: ['ET', 'ETH', 'Ethiopia'],
      supportedProviders: [
        VerificationProviderType.FAYDA_NIDP,
        VerificationProviderType.SMILE_IDENTITY,
        VerificationProviderType.MANUAL_ADMIN_REVIEW,
      ],
      supportsBiometricFaceMatch: true,
      supportsLiveness: true,
    },
    {
      type: IdentityDocumentType.ETHIOPIAN_PASSPORT,
      label: 'Ethiopian Passport',
      description: 'Current unexpired passport issued by the Immigration and Citizenship Service.',
      requiresIssuingCountry: true,
      allowedIssuingCountries: ['ET', 'ETH', 'Ethiopia'],
      supportedProviders: [
        VerificationProviderType.SMILE_IDENTITY,
        VerificationProviderType.PERSONA,
        VerificationProviderType.MANUAL_ADMIN_REVIEW,
      ],
      supportsBiometricFaceMatch: true,
      supportsLiveness: true,
    },
    {
      type: IdentityDocumentType.ETHIOPIAN_DRIVERS_LICENSE,
      label: "Ethiopian Driver's License",
      description: 'Official driving license issued by regional or federal transport authorities.',
      requiresIssuingCountry: true,
      allowedIssuingCountries: ['ET', 'ETH', 'Ethiopia'],
      supportedProviders: [
        VerificationProviderType.SMILE_IDENTITY,
        VerificationProviderType.PERSONA,
        VerificationProviderType.MANUAL_ADMIN_REVIEW,
      ],
      supportsBiometricFaceMatch: true,
      supportsLiveness: true,
    },
    {
      type: IdentityDocumentType.FOREIGN_PASSPORT,
      label: 'Foreign Passport (International Hosts)',
      description: 'Valid international passport for foreign nationals and diaspora hosting properties.',
      requiresIssuingCountry: true,
      allowedIssuingCountries: ['*'],
      supportedProviders: [
        VerificationProviderType.PERSONA,
        VerificationProviderType.SMILE_IDENTITY,
        VerificationProviderType.MANUAL_ADMIN_REVIEW,
      ],
      supportsBiometricFaceMatch: true,
      supportsLiveness: true,
    },
    {
      type: IdentityDocumentType.RESIDENCE_PERMIT,
      label: 'Ethiopian Residence Permit / Yellow Card',
      description: 'Official residency card or Ethiopian Origin identification for foreign nationals.',
      requiresIssuingCountry: true,
      allowedIssuingCountries: ['ET', 'ETH', 'Ethiopia'],
      supportedProviders: [
        VerificationProviderType.MANUAL_ADMIN_REVIEW,
        VerificationProviderType.SMILE_IDENTITY,
      ],
      supportsBiometricFaceMatch: false,
      supportsLiveness: true,
    },
  ];

  // Configurable list of supported issuing countries
  private readonly supportedCountries: CountryDescriptor[] = [
    { code: 'ET', name: 'Ethiopia' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'KE', name: 'Kenya' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'AU', name: 'Australia' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'SE', name: 'Sweden' },
    { code: 'OTHER', name: 'Other International Country' },
  ];

  constructor(private readonly configService: ConfigService) {}

  /**
   * Return full configurable list of supported document types and metadata.
   */
  getSupportedDocumentTypes(): DocumentTypeDescriptor[] {
    return this.supportedDocuments;
  }

  /**
   * Return configurable list of supported issuing countries.
   */
  getSupportedCountries(): CountryDescriptor[] {
    return this.supportedCountries;
  }

  /**
   * Return full configuration descriptor for API discovery.
   */
  getVerificationConfig() {
    return {
      supportedDocuments: this.supportedDocuments,
      supportedCountries: this.supportedCountries,
      providers: Object.keys(this.providerCapabilities),
      dataRetentionPolicy: {
        rawIdImagesRetained: false,
        fullIdNumbersStored: false,
        retentionRule: 'Document numbers are masked and hashed. Raw images are quarantined in private memory/storage with strict expiration.',
      },
    };
  }

  /**
   * Validate document type, issuing country, and provider compatibility.
   * If the selected provider does not support the document type, clearly communicates that limitation.
   */
  validateDocumentAndProvider(
    documentType: IdentityDocumentType,
    issuingCountry: string,
    provider: VerificationProviderType,
  ): DocumentTypeDescriptor {
    const docDesc = this.supportedDocuments.find((d) => d.type === documentType);
    if (!docDesc) {
      throw new BadRequestException(`Unsupported identity document type: "${documentType}".`);
    }

    // Validate issuing country
    const normalizedCountry = issuingCountry.trim().toUpperCase();
    if (docDesc.allowedIssuingCountries[0] !== '*') {
      const isAllowed = docDesc.allowedIssuingCountries.some(
        (c) => c.toUpperCase() === normalizedCountry,
      );
      if (!isAllowed) {
        throw new BadRequestException(
          `Document type "${docDesc.label}" must specify Ethiopia (ET) as the issuing country.`,
        );
      }
    }

    // Validate provider compatibility
    const supportedTypesForProvider = this.providerCapabilities[provider];
    if (!supportedTypesForProvider || !supportedTypesForProvider.includes(documentType)) {
      const compatibleProviders = Object.entries(this.providerCapabilities)
        .filter(([, types]) => types.includes(documentType))
        .map(([p]) => p);

      throw new BadRequestException(
        `Identity verification provider "${provider}" does not support document type "${docDesc.label}". Compatible providers for this document are: ${compatibleProviders.join(', ')}.`,
      );
    }

    return docDesc;
  }

  /**
   * Initiate a verification session and create audit record.
   * Binds verified identity to user account.
   */
  initiateVerificationSession(
    userId: string,
    hostProfileId: string,
    dto: RequestHostVerificationDto,
  ): VerificationAuditRecord {
    const provider = dto.verificationProvider || VerificationProviderType.MANUAL_ADMIN_REVIEW;
    const docDesc = this.validateDocumentAndProvider(dto.documentType, dto.issuingCountry, provider);

    // Document number privacy protection: mask and SHA-256 hash
    const cleanNum = dto.documentNumber.trim();
    const maskedNumber =
      cleanNum.length > 4
        ? `${'*'.repeat(Math.max(cleanNum.length - 4, 3))}-${cleanNum.slice(-4)}`
        : '****';

    const documentNumberHash = crypto
      .createHash('sha256')
      .update(cleanNum.toUpperCase())
      .digest('hex');

    const transactionId = `TX-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    const record: VerificationAuditRecord = {
      transactionId,
      userId,
      hostProfileId,
      provider,
      documentType: dto.documentType,
      issuingCountry: dto.issuingCountry,
      maskedDocumentNumber: maskedNumber,
      documentNumberHash,
      issuingAuthority: dto.issuingAuthority,
      expirationDate: dto.expirationDate,
      status: VerificationSessionStatus.PENDING,
      requiresExceptionReview: false,
      canRetry: true,
      createdAt: now,
      updatedAt: now,
      auditTrail: [
        {
          timestamp: now,
          action: 'SESSION_INITIATED',
          actor: `HOST:${userId}`,
          details: `Verification requested using ${dto.documentType} issued by ${dto.issuingCountry} via ${provider}.`,
        },
      ],
    };

    this.auditRecords.set(transactionId, record);
    this.userActiveSessions.set(userId, transactionId);

    this.logger.log(
      `Initiated verification session ${transactionId} for host ${userId} [${dto.documentType}, masked: ${maskedNumber}, provider: ${provider}]`,
    );

    return record;
  }

  /**
   * Securely validate an incoming provider webhook signature and timestamp freshness.
   * Treats provider results as authoritative only after securely validating the provider's response.
   */
  validateProviderWebhookSignature(
    rawBody: string,
    signature: string,
    timestamp: number,
    secret?: string,
  ): boolean {
    const webhookSecret =
      secret ||
      this.configService.get<string>('IDENTITY_PROVIDER_WEBHOOK_SECRET') ||
      'engida-provider-webhook-secret-key';

    if (!signature || !timestamp) {
      throw new UnauthorizedException('Missing provider webhook signature or timestamp.');
    }

    // Anti-replay check: 5-minute tolerance window
    const now = Date.now();
    if (Math.abs(now - timestamp) > 300000) {
      throw new UnauthorizedException('Provider webhook timestamp expired or clock skew exceeded 5 minutes.');
    }

    const payloadToSign = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadToSign)
      .digest('hex');

    // Constant-time comparison
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      this.logger.warn('Invalid provider webhook HMAC signature rejected.');
      throw new UnauthorizedException('Invalid identity provider webhook cryptographic signature.');
    }

    return true;
  }

  /**
   * Authoritative provider result processing.
   * Evaluates document authenticity, face matching, and liveness.
   * If inconclusive or failed, triggers exception workflow and allows secure retry.
   */
  processProviderResult(
    result: ProviderVerificationResult,
  ): {
    verified: boolean;
    status: HostVerificationStatus;
    exceptionWorkflow: boolean;
    canRetry: boolean;
    record: VerificationAuditRecord;
  } {
    const record = this.auditRecords.get(result.transactionId);
    if (!record) {
      throw new NotFoundException(`Verification session "${result.transactionId}" not found.`);
    }

    const now = new Date().toISOString();
    record.updatedAt = now;

    // Check 1: Document authenticity
    const isDocumentAuthentic = result.documentAuthentic === true;
    record.documentAuthentic = isDocumentAuthentic;

    // Check 2: Face matching (threshold >= 80% where applicable)
    const faceMatchPassed =
      result.faceMatchPassed !== undefined
        ? result.faceMatchPassed
        : result.faceMatchScore !== undefined
          ? result.faceMatchScore >= 80
          : true; // If provider did not perform face match
    record.faceMatchScore = result.faceMatchScore;
    record.faceMatchPassed = faceMatchPassed;

    // Check 3: Liveness detection
    const livenessPassed =
      result.livenessVerified !== undefined ? result.livenessVerified : true;
    record.livenessVerified = livenessPassed;

    const allChecksPassed = isDocumentAuthentic && faceMatchPassed && livenessPassed;

    if (allChecksPassed) {
      record.status = VerificationSessionStatus.VERIFIED;
      record.verifiedAt = now;
      record.requiresExceptionReview = false;
      record.canRetry = false;
      record.auditTrail.push({
        timestamp: now,
        action: 'PROVIDER_VERIFICATION_SUCCESS',
        actor: `PROVIDER:${record.provider}`,
        details: `Authenticity verified. FaceMatch: ${record.faceMatchScore ?? 'N/A'}%, Liveness: ${record.livenessVerified}.`,
      });

      this.logger.log(
        `Authoritative provider check PASSED for session ${result.transactionId} (Host: ${record.userId})`,
      );

      return {
        verified: true,
        status: HostVerificationStatus.VERIFIED,
        exceptionWorkflow: false,
        canRetry: false,
        record,
      };
    } else {
      // Inconclusive or failed automated check
      record.status = VerificationSessionStatus.INCONCLUSIVE;
      record.failureReason =
        result.failureReason ||
        (!isDocumentAuthentic
          ? 'Document authenticity check failed or could not be determined.'
          : !faceMatchPassed
            ? 'Biometric face match score fell below confidence threshold (80%).'
            : 'Liveness detection failed.');
      record.requiresExceptionReview = true;
      record.canRetry = true;
      record.auditTrail.push({
        timestamp: now,
        action: 'PROVIDER_VERIFICATION_INCONCLUSIVE',
        actor: `PROVIDER:${record.provider}`,
        details: `Reason: ${record.failureReason}. Escalated to manual exception workflow.`,
      });

      this.logger.warn(
        `Automated provider check INCONCLUSIVE for session ${result.transactionId}: ${record.failureReason}. Escalated to exception workflow.`,
      );

      return {
        verified: false,
        status: HostVerificationStatus.PENDING,
        exceptionWorkflow: true,
        canRetry: true,
        record,
      };
    }
  }

  /**
   * Record administrative compliance decision in audit trail.
   */
  recordAdminDecision(
    userId: string,
    action: 'APPROVED' | 'REJECTED' | 'REVOKED',
    adminId: string,
    reason?: string,
  ) {
    const txId = this.userActiveSessions.get(userId);
    if (!txId) return;

    const record = this.auditRecords.get(txId);
    if (!record) return;

    const now = new Date().toISOString();
    record.updatedAt = now;
    if (action === 'APPROVED') {
      record.status = VerificationSessionStatus.VERIFIED;
      record.verifiedAt = now;
    } else if (action === 'REJECTED' || action === 'REVOKED') {
      record.status = VerificationSessionStatus.REJECTED;
      record.failureReason = reason;
    }

    record.auditTrail.push({
      timestamp: now,
      action: `ADMIN_${action}`,
      actor: `ADMIN:${adminId}`,
      details: reason ? `Reason/Feedback: ${reason}` : undefined,
    });
  }

  /**
   * Retrieve active verification session or audit trail for a host.
   */
  getVerificationAudit(userId: string): VerificationAuditRecord | null {
    const txId = this.userActiveSessions.get(userId);
    if (!txId) return null;
    return this.auditRecords.get(txId) || null;
  }

  /**
   * Retrieve verification record by transaction ID.
   */
  getRecordByTransactionId(transactionId: string): VerificationAuditRecord | null {
    return this.auditRecords.get(transactionId) || null;
  }
}
