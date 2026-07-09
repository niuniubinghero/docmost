import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EnvironmentService } from './environment.service';

/**
 * Community Edition License Service
 *
 * This is the community edition which intentionally unlocks all features.
 * All license validation methods return permissive defaults to provide
 * the full feature set without requiring a commercial license key.
 *
 * To re-enable license enforcement for an enterprise build, replace these
 * stub methods with actual license validation logic.
 */
@Injectable()
export class LicenseCheckService {
  constructor(
    private moduleRef: ModuleRef,
    private environmentService: EnvironmentService,
  ) {}

  private readonly allFeatures: string[] = [
    'sso:custom', 'sso:google', 'mfa', 'api:keys', 'comment:resolution',
    'page:permissions', 'ai', 'import:confluence', 'import:docx', 'import:pdf',
    'attachment:indexing', 'security:settings', 'mcp', 'scim',
    'page:verification', 'audit:logs', 'retention', 'sharing:controls',
    'templates', 'comment:viewer', 'export:pdf',
  ];

  isValidEELicense(licenseKey: string): boolean {
    return true;
  }

  hasFeature(licenseKey: string, feature: string, plan?: string): boolean {
    return true;
  }

  getFeatures(licenseKey: string): string[] {
    return this.allFeatures;
  }

  resolveFeatures(licenseKey: string, plan: string): string[] {
    return this.allFeatures;
  }

  resolveTier(licenseKey: string, plan: string): string {
    return 'enterprise';
  }

  private getLicenseType(licenseKey: string): string | null {
    return 'enterprise';
  }
}
