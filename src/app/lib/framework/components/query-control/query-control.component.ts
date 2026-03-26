import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  ViewChild
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ENVIRONMENT_CONFIG, EnvironmentConfig } from '../../../config/tokens/environment.token';
import { DomainConfig } from '../../../config/models/domain-config.interface';
import {
  FilterDefinition,
  FilterOption,
  RangeConfig
} from '../../../config/models/filter-definition.interface';
import { ApiService } from '../../../state-management/services/api.service';
import { UrlStateService } from '../../../state-management/services/url-state.service';
import { Dropdown } from 'primeng/dropdown';

/**
 * Active filter representation
 *
 * Represents a currently active filter with its definition, selected values, and URL representation.
 * Used internally to track filters in the QueryControlComponent.
 *
 * @interface ActiveFilter
 *
 * @property {FilterDefinition} definition - The filter definition containing metadata like field, label, and type
 *
 * @property {(string|number)[]} values - Array of selected values for this filter.
 *           Examples: ["Toyota", "Honda"] for multiselect or [1990, 2020] for range
 *
 * @property {string} urlValue - Serialized string representation for URL parameters.
 *           Examples: "Toyota,Honda" (comma-separated) or "1990-2020" (range format)
 */
interface ActiveFilter {
  /**
   * The filter definition containing metadata like field, label, and type
   */
  definition: FilterDefinition;

  /**
   * Array of selected values for this filter (e.g., ["Toyota", "Honda"] or [1990, 2020])
   */
  values: (string | number)[];

  /**
   * Serialized string representation for URL parameters (e.g., "Toyota,Honda" or "1990-2020")
   */
  urlValue: string;
}

/**
 * Query Control Component
 *
 * Provides a manual filter management interface allowing users to:
 * - Select filterable fields from a dropdown
 * - Add filters via modal dialogs (multiselect or range)
 * - View active filters as chips
 * - Edit or remove existing filters
 * - Sync all state with URL parameters
 *
 * This component is DOMAIN-AGNOSTIC and works with any domain configuration.
 * All filter definitions come from DomainConfig.filters.
 *
 * Architecture:
 * - PrimeNG-First: Uses PrimeNG Dialog, Dropdown, Checkbox directly
 * - URL-First: All state changes via UrlStateService
 * - OnPush: Requires manual change detection via ChangeDetectorRef
 *
 * @example
 * ```html
 * <app-query-control [domainConfig]="domainConfig"></app-query-control>
 * ```
 */
@Component({
    selector: 'app-query-control',
    templateUrl: './query-control.component.html',
    styleUrls: ['./query-control.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueryControlComponent<TFilters = any, TData = any, TStatistics = any>
  implements OnInit, OnDestroy {

  private readonly destroy$ = new Subject<void>();

  readonly environment: EnvironmentConfig;

  @Input() domainConfig!: DomainConfig<TFilters, TData, TStatistics>;

  @Output() urlParamsChange = new EventEmitter<{ [key: string]: any }>();
  @Output() clearAllFilters = new EventEmitter<void>();

  @ViewChild('searchInput') searchInput: any;
  @ViewChild('filterFieldDropdown') filterFieldDropdown!: Dropdown;

  // ==================== Dropdown State ====================

  filterFieldOptions: { label: string; value: FilterDefinition }[] = [];
  selectedField: FilterDefinition | null = null;
  isHighlightFilter = false;

  /**
   * Tracks the field that was pending selection when dropdown opens.
   * Used to detect same-field reselection which doesn't trigger onChange.
   * BUG-004 Fix: PrimeNG doesn't fire onChange when selecting the same value.
   */
  private pendingFieldSelection: FilterDefinition | null = null;

  // ==================== Active Filters ====================

  activeFilters: ActiveFilter[] = [];
  activeHighlights: ActiveFilter[] = [];
  currentFilterDef: FilterDefinition | null = null;

  // ==================== Multiselect Dialog State ====================

  showMultiselectDialog = false;
  multiselectDialogTitle = '';
  multiselectDialogSubtitle = '';
  loadingOptions = false;
  optionsError: string | null = null;
  allOptions: FilterOption[] = [];
  filteredOptions: FilterOption[] = [];
  selectedOptions: (string | number)[] = [];
  searchQuery = '';

  // ==================== Range Dialog State ====================

  showRangeDialog = false;
  rangeMin: number | null = null;
  rangeMax: number | null = null;
  availableRange: { min: number; max: number } = { min: 0, max: Number.MAX_SAFE_INTEGER };
  currentRangeConfig: RangeConfig | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private apiService: ApiService,
    private urlState: UrlStateService,
    @Optional() @Inject(ENVIRONMENT_CONFIG) envConfig: EnvironmentConfig | null
  ) {
    this.environment = envConfig || { apiBaseUrl: '', production: false };
  }

  ngOnInit(): void {
    // Initialize filter field options from domain config
    // Only include queryControlFilters, NOT highlightFilters
    // (highlightFilters are for highlighting data, not for main filter selection)
    this.filterFieldOptions = this.domainConfig.queryControlFilters
      .map(f => ({ label: f.label, value: f }));

    // Sync from URL state on init and on changes
    this.urlState.params$.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.syncFiltersFromUrl(params);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Reset dropdown to its placeholder state.
   *
   * BUG-004 Fix: PrimeNG Dropdown maintains internal state that doesn't reset
   * when just setting ngModel to null. We must call clear() on the component
   * to ensure both the visual display and internal state are reset.
   * This allows the same option to be selected again and trigger onChange.
   */
  private resetFilterDropdown(): void {
    this.selectedField = null;
    // BUG-004 Fix: Reset PrimeNG's internal selection state
    // This ensures clicking the same option will trigger onChange next time
    if (this.filterFieldDropdown) {
      // In PrimeNG 14, clear() takes an Event argument. Pass a synthetic event.
      this.filterFieldDropdown.clear({ stopPropagation: () => {} } as any);
    }
    this.cdr.markForCheck();
  }

  /**
   * Handle dropdown keydown events for keyboard navigation
   *
   * Intercepts spacebar to select the highlighted option in filtered dropdown.
   * Reference: PrimeNG Issue #17779 - spacebar doesn't select when filter is active
   *
   * When [filter]="true" is set, the filter input captures spacebar events,
   * preventing selection. This handler detects spacebar and manually triggers selection
   * if an option is currently highlighted.
   *
   * Bug #15 Fix: When the dropdown filter is active, the visible list is filtered.
   * We cannot use index-based lookup on filterFieldOptions[] because the index
   * in the filtered DOM list doesn't match the index in the unfiltered array.
   * Instead, we extract the label from the highlighted element and find the
   * matching option by label.
   *
   * BUG-001 Fix: When Enter is pressed and no option is explicitly highlighted,
   * but there's exactly one visible option after filtering, select that option.
   * This allows users to type a filter and press Enter without needing ArrowDown.
   */
  onDropdownKeydown(event: KeyboardEvent): void {
    // Handle spacebar or Enter for selection
    if (event.key !== ' ' && event.key !== 'Enter') {
      return;
    }

    // When spacebar or Enter is pressed on a focused option (not in filter input),
    // we need to manually trigger the selection since PrimeNG's filter input
    // will capture the spacebar for typing

    // Check if there's a currently highlighted/focused option in the dropdown
    // PrimeNG 14 uses 'p-highlight' CSS class for highlighted options in the overlay
    const highlightedOption = document.querySelector('.p-dropdown-panel .p-dropdown-item.p-highlight');

    let optionToSelect: HTMLElement | null = highlightedOption as HTMLElement;

    // BUG-001 Fix: If no option is highlighted but Enter is pressed,
    // check if there's exactly one visible option and select it
    if (!optionToSelect && event.key === 'Enter') {
      const visibleOptions = document.querySelectorAll('.p-dropdown-panel .p-dropdown-item:not([style*="display: none"])');
      if (visibleOptions.length === 1) {
        optionToSelect = visibleOptions[0] as HTMLElement;
      }
    }

    if (optionToSelect) {
      // Prevent the key from being processed elsewhere
      event.preventDefault();
      event.stopPropagation();

      // Bug #15 Fix: Get the label text from the highlighted element and find
      // the matching option by label, not by index. This works correctly even
      // when the dropdown list is filtered.
      const optionLabel = optionToSelect.textContent?.trim();

      if (optionLabel) {
        // Find the option with matching label
        const matchingOption = this.filterFieldOptions.find(
          opt => opt.label === optionLabel
        );

        if (matchingOption) {
          // Create a synthetic onChange event with the correct value
          const syntheticEvent = {
            value: matchingOption.value,
            originalEvent: event
          };
          this.onFieldSelected(syntheticEvent);
        }
      }
    }
  }

  /**
   * Handle field selection from dropdown
   *
   * PrimeNG's onChange event fires on:
   * 1. Mouse clicks on an option
   * 2. Arrow key navigation (keyboard up/down)
   * 3. Enter/Space on an option
   *
   * We only want to open dialogs for #1 and #3, not #2.
   * Solution: Check the originalEvent to detect arrow key navigation.
   *
   * Reference: PrimeNG GitHub Issue #5335, #11703
   * The onChange event includes originalEvent which is the browser's keyboard/mouse event.
   * Arrow key navigation triggers onChange but the originalEvent.key will be 'ArrowUp' or 'ArrowDown'.
   */
  onFieldSelected(event: any): void {
    const filterDef: FilterDefinition = event.value;

    // If no filterDef, skip
    if (!filterDef) {
      return;
    }

    // Check if this onChange was triggered by arrow key navigation
    // The event.originalEvent contains the browser event that triggered the change
    if (event.originalEvent && event.originalEvent instanceof KeyboardEvent) {
      const key = event.originalEvent.key;

      // If it was an arrow key, this is just navigation - don't open dialog
      // Users are just browsing the dropdown, not making a selection
      if (['ArrowUp', 'ArrowDown'].includes(key)) {
        // BUG-004 Fix: Track the pending selection for onDropdownHide
        this.pendingFieldSelection = filterDef;
        return;
      }
    }

    // Clear pending selection since onChange fired for actual selection
    this.pendingFieldSelection = null;

    // This was a click, Enter, or Space - open the dialog
    this.openFilterDialog(filterDef);
  }

  /**
   * Handle dropdown panel hide event
   *
   * BUG-004 Fix: When dropdown closes without triggering onChange (e.g., clicking
   * away or pressing Escape), clear the pending selection state.
   */
  onDropdownHide(): void {
    // Clear pending selection when dropdown closes
    this.pendingFieldSelection = null;
  }

  /**
   * Open the appropriate dialog for a filter definition
   * Extracted into separate method for reuse from keyboard and mouse handlers
   */
  private openFilterDialog(filterDef: FilterDefinition): void {
    // Close any currently open dialogs before opening a new one
    // This prevents multiple dialogs from being open simultaneously
    this.showMultiselectDialog = false;
    this.showRangeDialog = false;

    this.currentFilterDef = filterDef;

    // Determine if this is a highlight filter by checking if urlParams starts with 'h_'
    this.isHighlightFilter = this.isHighlightFilterDef(filterDef);

    if (filterDef.type === 'multiselect') {
      this.openMultiselectDialog(filterDef);
    } else if (filterDef.type === 'range') {
      this.openRangeDialog(filterDef);
    }

    // Reset dropdown selection
    this.selectedField = null;
    this.cdr.markForCheck();
  }

  /**
   * Check if a filter definition is a highlight filter
   */
  private isHighlightFilterDef(filterDef: FilterDefinition): boolean {
    if (typeof filterDef.urlParams === 'string') {
      return filterDef.urlParams.startsWith('h_');
    } else if (typeof filterDef.urlParams === 'object') {
      // For range filters, check if min param starts with 'h_'
      return filterDef.urlParams.min?.startsWith('h_') || false;
    }
    return false;
  }

  // ==================== Multiselect Dialog ====================

  /**
   * Open multiselect dialog and load options
   */
  private openMultiselectDialog(filterDef: FilterDefinition): void {
    this.multiselectDialogTitle = `Select ${filterDef.label}`;
    this.multiselectDialogSubtitle = filterDef.dialogSubtitle ||
      `Select one or more ${filterDef.label.toLowerCase()} values to filter results.`;
    this.searchQuery = '';
    this.selectedOptions = [];
    this.loadingOptions = true;
    this.optionsError = null;
    this.showMultiselectDialog = true;
    this.cdr.markForCheck();

    // Check if editing existing filter (check both regular filters and highlights)
    const filterList = this.isHighlightFilter ? this.activeHighlights : this.activeFilters;
    const existingFilter = filterList.find(f => f.definition.field === filterDef.field);
    if (existingFilter) {
      this.selectedOptions = [...existingFilter.values];
    }

    // Load options from API
    if (filterDef.optionsEndpoint) {
      this.apiService.get(filterDef.optionsEndpoint).subscribe({
        next: (response) => {
          this.allOptions = filterDef.optionsTransformer?.(response) || [];
          this.filteredOptions = [...this.allOptions];
          this.loadingOptions = false;
          this.optionsError = null;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingOptions = false;
          this.optionsError = 'Failed to load options. Please try again.';
          this.cdr.markForCheck();
        }
      });
    }
  }

  /**
   * Handle multiselect dialog show event - shift focus to the dialog
   * This is called by PrimeNG's (onShow) event after dialog is fully rendered
   */
  onMultiselectDialogShow(): void {
    // Focus the search input field so users can immediately start typing
    if (this.searchInput && this.searchInput.nativeElement) {
      // Use setTimeout to ensure the dialog is fully rendered before focusing
      setTimeout(() => {
        this.searchInput.nativeElement.focus();
      }, 0);
    }
  }

  /**
   * Search options in multiselect dialog
   */
  onSearchChange(query: string): void {
    const lowerQuery = query.toLowerCase();
    this.filteredOptions = this.allOptions.filter(opt =>
      opt.label.toLowerCase().includes(lowerQuery)
    );
    this.cdr.markForCheck();
  }

  /**
   * Retry loading options after error
   */
  retryLoadOptions(): void {
    if (this.currentFilterDef) {
      this.openMultiselectDialog(this.currentFilterDef);
    }
  }

  /**
   * Apply multiselect filter
   */
  applyFilter(): void {
    if (!this.currentFilterDef || this.selectedOptions.length === 0) {
      // Close dialog without applying if no selections
      this.cancelDialog();
      return;
    }

    // Update URL with new filter and reset pagination
    const paramName = this.currentFilterDef.urlParams as string;
    const paramValue = this.selectedOptions.join(',');

    this.urlParamsChange.emit({
      [paramName]: paramValue,
      page: 1 // Reset to first page when filter changes (1-indexed)
    });

    this.showMultiselectDialog = false;
    this.currentFilterDef = null;
    this.resetFilterDropdown();
    this.cdr.detectChanges(); // Force immediate update instead of markForCheck()
  }

  // ==================== Range Dialog ====================

  /**
   * Open range dialog with config-driven settings
   *
   * Uses FilterDefinition.rangeConfig for labels, placeholders, step, etc.
   * Falls back to sensible defaults if rangeConfig is not provided.
   */
  private openRangeDialog(filterDef: FilterDefinition): void {
    this.showRangeDialog = true;
    this.rangeMin = null;
    this.rangeMax = null;
    this.currentRangeConfig = filterDef.rangeConfig || null;

    // Set default available range from config or use safe defaults
    if (filterDef.rangeConfig?.defaultRange) {
      this.availableRange = { ...filterDef.rangeConfig.defaultRange };
    } else {
      this.availableRange = { min: 0, max: Number.MAX_SAFE_INTEGER };
    }

    this.cdr.markForCheck();

    // Check if editing existing filter
    const params = this.urlState.getParams();
    const urlParamsConfig = filterDef.urlParams as { min: string; max: string };

    if (params[urlParamsConfig.min]) {
      this.rangeMin = this.parseRangeValue(params[urlParamsConfig.min], filterDef.rangeConfig);
    }
    if (params[urlParamsConfig.max]) {
      this.rangeMax = this.parseRangeValue(params[urlParamsConfig.max], filterDef.rangeConfig);
    }

    // Load available range from API if endpoint provided
    if (filterDef.optionsEndpoint) {
      this.apiService.get(filterDef.optionsEndpoint).subscribe({
        next: (response: any) => {
          if (response && response.min !== undefined && response.max !== undefined) {
            this.availableRange = { min: response.min, max: response.max };
          }
          this.cdr.markForCheck();
        },
        error: () => {
          // Use defaults if API fails
          this.cdr.markForCheck();
        }
      });
    }
  }

  /**
   * Parse a range value based on the range config type
   */
  private parseRangeValue(value: string, config: RangeConfig | undefined): number {
    if (!config || config.valueType === 'integer') {
      return parseInt(value, 10);
    } else if (config.valueType === 'decimal') {
      return parseFloat(value);
    }
    // For datetime, we still parse as number (timestamp) for now
    return parseInt(value, 10);
  }

  /**
   * Get the step value for range inputs based on config
   */
  getRangeStep(): number {
    if (!this.currentRangeConfig) {
      return 1;
    }
    if (this.currentRangeConfig.step !== undefined) {
      return this.currentRangeConfig.step;
    }
    // Default steps based on value type
    return this.currentRangeConfig.valueType === 'decimal' ? 0.01 : 1;
  }

  /**
   * Get whether to use grouping (thousand separators) for range inputs
   */
  getRangeUseGrouping(): boolean {
    return this.currentRangeConfig?.useGrouping ?? false;
  }

  /**
   * Get the number of decimal places for range inputs
   */
  getRangeDecimalPlaces(): number {
    if (!this.currentRangeConfig || this.currentRangeConfig.valueType !== 'decimal') {
      return 0;
    }
    return this.currentRangeConfig.decimalPlaces ?? 2;
  }

  /**
   * Handle range dialog show event - shift focus to the dialog
   * This is called by PrimeNG's (onShow) event after dialog is fully rendered
   */
  onRangeDialogShow(): void {
    // Shift focus to the first focusable element in the dialog (usually the first input)
    const dialogElement = document.querySelector('.p-dialog-content input, .p-dialog-content button, .p-dialog-content');
    if (dialogElement) {
      (dialogElement as HTMLElement).focus();
    }
  }

  /**
   * Apply range filter
   */
  applyRange(): void {
    if (!this.currentFilterDef) {
      return;
    }

    const urlParamsConfig = this.currentFilterDef.urlParams as { min: string; max: string };
    const params: any = {
      page: 1 // Reset to first page when range changes (1-indexed)
    };

    if (this.rangeMin !== null) {
      params[urlParamsConfig.min] = this.rangeMin.toString();
    }
    if (this.rangeMax !== null) {
      params[urlParamsConfig.max] = this.rangeMax.toString();
    }

    // Emit URL params (page reset is always included)
    this.urlParamsChange.emit(params);

    this.showRangeDialog = false;
    this.currentFilterDef = null;
    this.currentRangeConfig = null;
    this.resetFilterDropdown();
    this.cdr.detectChanges();
  }

  // ==================== Dialog Management ====================

  /**
   * Cancel dialog without applying changes
   */
  cancelDialog(): void {
    this.showMultiselectDialog = false;
    this.showRangeDialog = false;
    this.currentFilterDef = null;
    this.currentRangeConfig = null;
    this.selectedOptions = [];
    this.searchQuery = '';
    this.rangeMin = null;
    this.rangeMax = null;
    this.optionsError = null;
    this.resetFilterDropdown();
    this.cdr.detectChanges();
  }

  /**
   * Handle dialog hide event
   *
   * Called by PrimeNG's (onHide) when dialog closes for any reason:
   * - User clicks X button
   * - User presses Escape (with closeOnEscape="true")
   * - User clicks modal backdrop (with dismissableMask="true")
   *
   * IMPORTANT: Must reset both visibility flags to prevent dialog reopening.
   * PrimeNG closes the dialog visually but Angular's [visible] binding must
   * also be set to false, otherwise the dialog reopens on next change detection.
   */
  onDialogHide(): void {
    this.showMultiselectDialog = false;
    this.showRangeDialog = false;
    this.currentFilterDef = null;
    this.currentRangeConfig = null;
    this.optionsError = null;
    this.resetFilterDropdown();
    this.cdr.detectChanges();
  }

  // ==================== Filter Chip Management ====================

  /**
   * Remove filter chip
   */
  removeFilter(filter: ActiveFilter): void {
    if (filter.definition.type === 'range') {
      // For range filters, clear both min and max params and reset pagination
      const urlParamsConfig = filter.definition.urlParams as { min: string; max: string };
      this.urlParamsChange.emit({
        [urlParamsConfig.min]: null,
        [urlParamsConfig.max]: null,
        page: 1 // Reset to first page when filter removed (1-indexed)
      } as any);
    } else {
      const paramName = filter.definition.urlParams as string;
      this.urlParamsChange.emit({
        [paramName]: null,
        page: 1 // Reset to first page when filter removed (1-indexed)
      } as any);
    }
  }

  /**
   * Handle click on filter chip
   *
   * BUG-006 Fix: Check if click originated from the remove button.
   * If so, don't open the edit dialog - the onRemove handler already
   * handled it.
   */
  onChipClick(event: MouseEvent, filter: ActiveFilter): void {
    // Check if the click came from the remove button (X icon)
    const target = event.target as HTMLElement;
    if (this.isRemoveButtonClick(target)) {
      // Don't open edit dialog - let onRemove handle it
      return;
    }
    this.editFilter(filter);
  }

  /**
   * Handle click on highlight chip
   *
   * BUG-006 Fix: Same logic as onChipClick for highlight chips.
   */
  onHighlightChipClick(event: MouseEvent, filter: ActiveFilter): void {
    // Check if the click came from the remove button (X icon)
    const target = event.target as HTMLElement;
    if (this.isRemoveButtonClick(target)) {
      // Don't open edit dialog - let onRemove handle it
      return;
    }
    this.editHighlight(filter);
  }

  /**
   * Check if an element or its parent is the remove button
   *
   * PrimeNG chip remove button has class 'p-chip-remove-icon' or 'pi-times-circle'.
   * We check the element and its parents up to the chip container.
   */
  private isRemoveButtonClick(element: HTMLElement): boolean {
    let current: HTMLElement | null = element;
    while (current) {
      // Check for PrimeNG chip remove icon classes
      if (current.classList.contains('p-chip-remove-icon') ||
          current.classList.contains('pi-times-circle') ||
          current.classList.contains('pi-times')) {
        return true;
      }
      // Stop if we've reached the chip container
      if (current.classList.contains('p-chip')) {
        break;
      }
      current = current.parentElement;
    }
    return false;
  }

  /**
   * Edit existing filter
   */
  editFilter(filter: ActiveFilter): void {
    this.currentFilterDef = filter.definition;
    this.isHighlightFilter = false; // Regular filter

    if (filter.definition.type === 'multiselect') {
      this.openMultiselectDialog(filter.definition);
    } else if (filter.definition.type === 'range') {
      this.openRangeDialog(filter.definition);
    }
  }

  /**
   * Edit existing highlight filter
   */
  editHighlight(filter: ActiveFilter): void {
    this.currentFilterDef = filter.definition;
    this.isHighlightFilter = true; // Highlight filter

    if (filter.definition.type === 'multiselect') {
      this.openMultiselectDialog(filter.definition);
    } else if (filter.definition.type === 'range') {
      this.openRangeDialog(filter.definition);
    }
  }

  /**
   * Remove highlight filter chip
   */
  removeHighlight(filter: ActiveFilter): void {
    if (filter.definition.type === 'range') {
      // For range filters, clear both min and max params and reset pagination
      const urlParamsConfig = filter.definition.urlParams as { min: string; max: string };
      this.urlParamsChange.emit({
        [urlParamsConfig.min]: null,
        [urlParamsConfig.max]: null,
        page: 1 // Reset to first page when filter removed (1-indexed)
      } as any);
    } else {
      const paramName = filter.definition.urlParams as string;
      this.urlParamsChange.emit({
        [paramName]: null,
        page: 1 // Reset to first page when filter removed (1-indexed)
      } as any);
    }
  }

  /**
   * Clear all highlight filters
   */
  clearAllHighlights(): void {
    if (this.activeHighlights.length === 0) {
      return; // Nothing to clear
    }

    const params: any = { page: 1 }; // Reset to first page

    // Collect all highlight URL params to clear
    for (const highlight of this.activeHighlights) {
      if (highlight.definition.type === 'range') {
        const urlParamsConfig = highlight.definition.urlParams as { min: string; max: string };
        params[urlParamsConfig.min] = null;
        params[urlParamsConfig.max] = null;
      } else {
        const paramName = highlight.definition.urlParams as string;
        params[paramName] = null;
      }
    }

    this.urlParamsChange.emit(params);
  }

  /**
   * Clear all filters (both regular filters AND highlights)
   *
   * Emits clearAllFilters event - parent component handles by calling urlState.clearParams()
   */
  clearAll(): void {
    this.clearAllFilters.emit();
  }

  /**
   * Check if there are any active filters or highlights
   */
  hasActiveFiltersOrHighlights(): boolean {
    return this.activeFilters.length > 0 || this.activeHighlights.length > 0;
  }

  // ==================== URL Sync ====================

  /**
   * Sync active filters from URL params
   */
  private syncFiltersFromUrl(params: any): void {
    this.activeFilters = [];
    this.activeHighlights = [];

    // Sync regular filters
    for (const filterDef of this.domainConfig.queryControlFilters) {
      this.syncFilterFromUrl(params, filterDef, this.activeFilters);
    }

    // Sync highlight filters
    if (this.domainConfig.highlightFilters) {
      for (const filterDef of this.domainConfig.highlightFilters) {
        this.syncFilterFromUrl(params, filterDef, this.activeHighlights);
      }
    }
  }

  /**
   * Sync a single filter from URL params
   */
  private syncFilterFromUrl(params: any, filterDef: FilterDefinition, targetArray: ActiveFilter[]): void {
    if (filterDef.type === 'range') {
      // Handle range filters (yearMin, yearMax or h_yearMin, h_yearMax)
      const urlParamsConfig = filterDef.urlParams as { min: string; max: string };
      const minValue = params[urlParamsConfig.min];
      const maxValue = params[urlParamsConfig.max];

      if (minValue || maxValue) {
        const values: (string | number)[] = [];
        if (minValue) values.push(minValue);
        if (maxValue) values.push(maxValue);

        targetArray.push({
          definition: filterDef,
          values: values,
          urlValue: `${minValue || ''}-${maxValue || ''}`
        });
      }
    } else {
      // Handle multiselect/text filters
      const paramName = filterDef.urlParams as string;
      const paramValue = params[paramName];

      if (paramValue) {
        // Handle both string and array values (array can come from multiselect)
        const values = Array.isArray(paramValue)
          ? paramValue
          : paramValue.split(',');
        const urlValue = Array.isArray(paramValue)
          ? paramValue.join(',')
          : paramValue;
        targetArray.push({
          definition: filterDef,
          values: values,
          urlValue: urlValue
        });
      }
    }
  }

  // ==================== Display Helpers ====================

  /**
   * Get chip label for display
   */
  getChipLabel(filter: ActiveFilter): string {
    if (filter.definition.type === 'range') {
      const values = filter.values;
      if (values.length === 2) {
        return `${filter.definition.label}: ${values[0]} - ${values[1]}`;
      } else if (values.length === 1) {
        return `${filter.definition.label}: ${values[0]}`;
      }
      return `${filter.definition.label}`;
    }

    // For multiselect, truncate if too many values
    const displayValues = filter.values.slice(0, 3).join(', ');
    const remaining = filter.values.length - 3;
    return remaining > 0
      ? `${filter.definition.label}: ${displayValues}... +${remaining}`
      : `${filter.definition.label}: ${displayValues}`;
  }

  /**
   * Get chip tooltip
   */
  getChipTooltip(filter: ActiveFilter): string {
    return `${filter.definition.label}: ${filter.values.join(', ')} (Click to edit)`;
  }

  /**
   * Get selection summary for dialog footer
   */
  getSelectionSummary(): string {
    const summary = this.selectedOptions.slice(0, 3).join(', ');
    return this.selectedOptions.length > 3
      ? `${summary}...`
      : summary;
  }
}
