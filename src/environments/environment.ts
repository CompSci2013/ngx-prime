/**
 * Development Environment Configuration
 *
 * @fileoverview
 * Environment configuration for development builds. This file defines runtime settings
 * for the application during development with ng serve or development server.
 *
 * @remarks
 * **Build-Time Replacement**:
 * This file is replaced during production builds via the `fileReplacements` array in angular.json.
 * The build process automatically uses environment.prod.ts instead when building with
 * --configuration production flag.
 *
 * **Configuration Details**:
 * - `production`: false - Development mode enabled for debugging
 * - `apiBaseUrl`: Development backend endpoint via Kubernetes Traefik ingress
 * - `includeTestIds`: true - Enables test-id attributes for E2E Playwright tests
 *
 * **Backend Access**:
 * The API endpoint (http://generic-prime.minilab/api/specs/v1) uses Traefik ingress
 * on the Kubernetes control plane (Loki), allowing access from:
 * - Thor SSH shell
 * - Development container via `--network host`
 * - E2E test container (with /etc/hosts entry)
 * - Windows client (with /etc/hosts pointing to 192.168.0.110)
 *
 * @see environment.prod.ts - Production environment configuration
 * @see angular.json - Build configuration with fileReplacements array
 *
 * @version 1.0
 * @since 1.0.0
 */

/**
 * Environment object containing runtime configuration for development
 *
 * @type {Object}
 * @property {boolean} production - Whether running in production mode (false for development)
 * @property {string} apiBaseUrl - Base URL for backend API calls
 * @property {boolean} includeTestIds - Enable test-id attributes for E2E testing
 */
export const environment = {
  /** Development mode flag - controls debug output and feature availability */
  production: false,

  /**
   * Backend API endpoint
   *
   * URL pattern: http://generic-prime.minilab/api/specs/v1
   * - Hostname: generic-prime.minilab (resolves to Loki 192.168.0.110 via /etc/hosts)
   * - Port: 80 (standard HTTP, routed through Traefik ingress)
   * - Path: /api/specs/v1 (API route prefix for data discovery service)
   */
  apiBaseUrl: 'http://192.168.0.244:4208/api/specs/v1',

  /**
   * E2E test attribute flag
   *
   * When true, Angular components can use [attr.data-testid] for test selectors.
   * These attributes are automatically stripped during production builds.
   */
  includeTestIds: true
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
