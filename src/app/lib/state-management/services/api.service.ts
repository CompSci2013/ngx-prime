import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse, StandardApiResponse } from '../models/api-response.interface';

/**
 * Options for API requests
 */
export interface ApiRequestOptions {
  /**
   * Query parameters to append to the URL
   */
  params?: Record<string, any>;

  /**
   * HTTP headers to include
   */
  headers?: Record<string, string>;

  /**
   * Whether to include credentials (cookies)
   */
  withCredentials?: boolean;

  /**
   * Response type (default: 'json')
   */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

/**
 * Domain-agnostic API service for making HTTP requests
 *
 * This service provides a thin, type-safe wrapper around Angular's HttpClient.
 * It handles common patterns like query parameter serialization and error handling.
 *
 * @example
 * ```typescript
 * // GET request with pagination
 * apiService.get<Vehicle>('/vehicles', {
 *   params: { page: 1, size: 20 }
 * }).subscribe(response => {
 *   console.log(response.results);
 * });
 *
 * // POST request
 * apiService.post<Vehicle>('/vehicles', {
 *   manufacturer: 'Ford',
 *   model: 'F-150'
 * }).subscribe(vehicle => {
 *   console.log(vehicle);
 * });
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Execute a GET request
   *
   * @template TData - The type of items in the response
   * @param endpoint - API endpoint (absolute or relative URL)
   * @param options - Request options (params, headers, etc.)
   * @returns Observable of paginated response
   */
  get<TData>(
    endpoint: string,
    options?: ApiRequestOptions
  ): Observable<ApiResponse<TData>> {
    const httpParams = this.buildHttpParams(options?.params);

    return this.http
      .get<ApiResponse<TData>>(endpoint, {
        params: httpParams,
        headers: options?.headers,
        withCredentials: options?.withCredentials
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Execute a POST request
   *
   * @template TData - The type of response data
   * @param endpoint - API endpoint (absolute or relative URL)
   * @param body - Request body
   * @param options - Request options (params, headers, etc.)
   * @returns Observable of response data
   */
  post<TData>(
    endpoint: string,
    body: any,
    options?: ApiRequestOptions
  ): Observable<TData> {
    const httpParams = this.buildHttpParams(options?.params);

    return this.http
      .post<TData>(endpoint, body, {
        params: httpParams,
        headers: options?.headers,
        withCredentials: options?.withCredentials
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Execute a PUT request
   *
   * @template TData - The type of response data
   * @param endpoint - API endpoint (absolute or relative URL)
   * @param body - Request body
   * @param options - Request options (params, headers, etc.)
   * @returns Observable of response data
   */
  put<TData>(
    endpoint: string,
    body: any,
    options?: ApiRequestOptions
  ): Observable<TData> {
    const httpParams = this.buildHttpParams(options?.params);

    return this.http
      .put<TData>(endpoint, body, {
        params: httpParams,
        headers: options?.headers,
        withCredentials: options?.withCredentials
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Execute a PATCH request
   *
   * @template TData - The type of response data
   * @param endpoint - API endpoint (absolute or relative URL)
   * @param body - Request body
   * @param options - Request options (params, headers, etc.)
   * @returns Observable of response data
   */
  patch<TData>(
    endpoint: string,
    body: any,
    options?: ApiRequestOptions
  ): Observable<TData> {
    const httpParams = this.buildHttpParams(options?.params);

    return this.http
      .patch<TData>(endpoint, body, {
        params: httpParams,
        headers: options?.headers,
        withCredentials: options?.withCredentials
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Execute a DELETE request
   *
   * @template TData - The type of response data
   * @param endpoint - API endpoint (absolute or relative URL)
   * @param options - Request options (params, headers, etc.)
   * @returns Observable of response data
   */
  delete<TData>(
    endpoint: string,
    options?: ApiRequestOptions
  ): Observable<TData> {
    const httpParams = this.buildHttpParams(options?.params);

    return this.http
      .delete<TData>(endpoint, {
        params: httpParams,
        headers: options?.headers,
        withCredentials: options?.withCredentials
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Execute a GET request that returns a standard success/error response
   *
   * @template TData - The type of data in the response
   * @param endpoint - API endpoint (absolute or relative URL)
   * @param options - Request options (params, headers, etc.)
   * @returns Observable of response data (unwrapped from success envelope)
   */
  getStandard<TData>(
    endpoint: string,
    options?: ApiRequestOptions
  ): Observable<TData> {
    const httpParams = this.buildHttpParams(options?.params);

    return this.http
      .get<StandardApiResponse<TData>>(endpoint, {
        params: httpParams,
        headers: options?.headers,
        withCredentials: options?.withCredentials
      })
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          } else {
            throw new Error(response.error.message);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Build HttpParams from a plain object
   *
   * Handles:
   * - Null/undefined value filtering
   * - Array serialization (comma-separated)
   * - Boolean/number to string conversion
   *
   * @param params - Plain object of query parameters
   * @returns HttpParams instance
   */
  private buildHttpParams(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();

    if (!params) {
      return httpParams;
    }

    Object.keys(params).forEach(key => {
      const value = params[key];

      // Skip null/undefined values
      if (value === null || value === undefined) {
        return;
      }

      // Handle arrays (comma-separated)
      if (Array.isArray(value)) {
        httpParams = httpParams.set(key, value.join(','));
        return;
      }

      // Convert to string
      httpParams = httpParams.set(key, String(value));
    });

    return httpParams;
  }

  /**
   * Handle HTTP errors
   *
   * @param error - HTTP error response
   * @returns Observable that throws a formatted error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Network error: ${error.error.message}`;
    } else {
      // Backend error
      if (error.error?.error?.message) {
        // Structured error response
        errorMessage = error.error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = `Server error: ${error.status} ${error.statusText}`;
      }
    }

    console.error('API Error:', errorMessage, error);

    return throwError(() => new Error(errorMessage));
  }
}
