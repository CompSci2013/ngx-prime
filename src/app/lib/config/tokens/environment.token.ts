import { InjectionToken } from '@angular/core';

export interface EnvironmentConfig {
  apiBaseUrl: string;
  production: boolean;
  includeTestIds?: boolean;
  [key: string]: any;
}

export const ENVIRONMENT_CONFIG = new InjectionToken<EnvironmentConfig>('ENVIRONMENT_CONFIG');
