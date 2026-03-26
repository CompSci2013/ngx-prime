import { Injectable } from '@angular/core';
import { PickerConfig } from '../models/picker-config.interface';

/**
 * Picker Configuration Registry Service
 *
 * Central registry for managing picker configurations.
 * Allows registration and retrieval of picker configs by ID.
 *
 * @example
 * ```typescript
 * // In domain config module
 * @NgModule({
 *   providers: []
 * })
 * export class AutomobileDomainConfigModule {
 *   constructor(private registry: PickerConfigRegistry) {
 *     // Register picker configs
 *     this.registry.register(VEHICLE_PICKER_CONFIG);
 *     this.registry.register(MANUFACTURER_MODEL_PICKER_CONFIG);
 *   }
 * }
 *
 * // In component
 * export class MyComponent {
 *   pickerConfig: PickerConfig<Vehicle>;
 *
 *   constructor(private registry: PickerConfigRegistry) {
 *     this.pickerConfig = registry.get('vehicle-picker');
 *   }
 * }
 *
 * // In template
 * <app-base-picker [configId]="'vehicle-picker'"></app-base-picker>
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class PickerConfigRegistry {
  /**
   * Storage for registered picker configurations
   *
   * Maps picker ID strings to their corresponding PickerConfig instances.
   * Used internally to store and retrieve picker configurations.
   *
   * @private
   */
  private configs = new Map<string, PickerConfig<any>>();

  /**
   * Register a picker configuration
   *
   * @template T - The data model type
   * @param config - Picker configuration to register
   * @throws Error if picker ID is already registered
   *
   * @example
   * ```typescript
   * const vehicleConfig: PickerConfig<Vehicle> = {
   *   id: 'vehicle-picker',
   *   displayName: 'Vehicle Selection',
   *   // ... rest of config
   * };
   *
   * registry.register(vehicleConfig);
   * ```
   */
  register<T>(config: PickerConfig<T>): void {
    if (this.configs.has(config.id)) {
      console.warn(
        `Picker config with ID '${config.id}' is already registered. ` +
        `Overwriting existing configuration.`
      );
    }

    this.configs.set(config.id, config);
  }

  /**
   * Register multiple picker configurations at once
   *
   * @param configs - Array of picker configurations
   *
   * @example
   * ```typescript
   * registry.registerMultiple([
   *   VEHICLE_PICKER_CONFIG,
   *   MANUFACTURER_MODEL_PICKER_CONFIG,
   *   VIN_PICKER_CONFIG
   * ]);
   * ```
   */
  registerMultiple(configs: PickerConfig<any>[]): void {
    configs.forEach(config => this.register(config));
  }

  /**
   * Get picker configuration by ID
   *
   * @template T - The data model type
   * @param id - Picker configuration ID
   * @returns Picker configuration
   * @throws Error if picker ID is not found
   *
   * @example
   * ```typescript
   * const config = registry.get<Vehicle>('vehicle-picker');
   * ```
   */
  get<T>(id: string): PickerConfig<T> {
    const config = this.configs.get(id);

    if (!config) {
      throw new Error(
        `Picker configuration with ID '${id}' not found. ` +
        `Available pickers: ${Array.from(this.configs.keys()).join(', ')}`
      );
    }

    return config as PickerConfig<T>;
  }

  /**
   * Check if picker configuration exists
   *
   * @param id - Picker configuration ID
   * @returns True if picker config exists
   *
   * @example
   * ```typescript
   * if (registry.has('vehicle-picker')) {
   *   const config = registry.get('vehicle-picker');
   * }
   * ```
   */
  has(id: string): boolean {
    return this.configs.has(id);
  }

  /**
   * Get all registered picker IDs
   *
   * @returns Array of picker configuration IDs
   *
   * @example
   * ```typescript
   * const pickerIds = registry.getAllIds();
   * console.log('Available pickers:', pickerIds);
   * ```
   */
  getAllIds(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Get all registered picker configurations
   *
   * @returns Array of all picker configurations
   *
   * @example
   * ```typescript
   * const allConfigs = registry.getAll();
   * console.log(`Total pickers: ${allConfigs.length}`);
   * ```
   */
  getAll(): PickerConfig<any>[] {
    return Array.from(this.configs.values());
  }

  /**
   * Unregister a picker configuration
   *
   * @param id - Picker configuration ID
   * @returns True if picker was removed, false if not found
   *
   * @example
   * ```typescript
   * registry.unregister('vehicle-picker');
   * ```
   */
  unregister(id: string): boolean {
    return this.configs.delete(id);
  }

  /**
   * Clear all registered picker configurations
   *
   * Useful for testing or dynamic configuration scenarios.
   *
   * @example
   * ```typescript
   * registry.clear();
   * ```
   */
  clear(): void {
    this.configs.clear();
  }

  /**
   * Get count of registered pickers
   *
   * @returns Number of registered pickers
   *
   * @example
   * ```typescript
   * const count = registry.getCount();
   * console.log(`${count} pickers registered`);
   * ```
   */
  getCount(): number {
    return this.configs.size;
  }
}
