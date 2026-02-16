import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter, debounceTime } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { DomainConfig, FilterDefinition, FilterOption } from '../../models/domain-config.interface';
import { ResourceManagementService } from '../../services/resource-management.service';
import { PopOutContextService } from '../../services/popout-context.service';
import { PopOutMessageType } from '../../models/popout.interface';


/**
 * Query Panel Component
 *
 * Domain-agnostic filter panel for applying filters to data.
 * Renders filter controls dynamically based on domainConfig.filters configuration.
 *
 * Supports filter types:
 * - text: Text input with clear button
 * - number: Numeric input with spinner buttons
 * - range: Dual inputs for min/max values
 * - select: Single-select dropdown
 * - multiselect: Multi-select dropdown
 * - date: Date picker
 * - boolean: Checkbox
 *
 * Subscribes to ResourceManagementService for filter state.
 * Updates filters via ResourceManagementService.updateFilters().
 *
 * @template TFilters - Domain-specific filter model type
 * @template TData - Domain-specific data model type
 * @template TStatistics - Domain-specific statistics model type
 *
 * @example
 * ```html
 * <app-query-panel
 *   [domainConfig]="automobileDomainConfig">
 * </app-query-panel>
 * ```
 */
@Component({
    selector: 'app-query-panel',
    templateUrl: './query-panel.component.html',
    styleUrls: ['./query-panel.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueryPanelComponent<TFilters = any, TData = any, TStatistics = any>
  implements OnInit, OnDestroy {

  readonly environment = environment;

  @Input() domainConfig!: DomainConfig<TFilters, TData, TStatistics>;

  /**
   * Emits when URL parameters should be updated with new filter values
   * Used by parent components (e.g., panel-popout) to sync with main window
   */
  @Output() urlParamsChange = new EventEmitter<{ [key: string]: any }>();

  /**
   * Emits when all filters should be cleared
   */
  @Output() clearAllFilters = new EventEmitter<void>();

  // Observables from resource service
  filters$!: Observable<TFilters>;

  // Component state
  currentFilters: Record<string, any> = {};
  dynamicOptions: Record<string, FilterOption[]> = {};
  autocompleteSuggestions: Record<string, string[]> = {};

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<{ field: string; value: any }>();

  constructor(
    private resourceService: ResourceManagementService<TFilters, TData, TStatistics>,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private popOutContext: PopOutContextService
  ) {
    // Setup debounced search for text inputs
    this.searchSubject.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(({ field, value }) => {
      this.applyFilterChange(field, value);
    });
  }

  ngOnInit(): void {
    if (!this.domainConfig) {
      throw new Error('QueryPanelComponent requires domainConfig input');
    }

    // Load dynamic options for filters with optionsEndpoint
    this.loadDynamicFilterOptions();

    // Subscribe to filter state
    this.filters$ = this.resourceService.filters$;

    this.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filters => {
        this.currentFilters = { ...filters as any };
        this.cdr.markForCheck();
      });

    // Pop-out window support
    if (this.popOutContext.isInPopOut()) {
      this.popOutContext
        .getMessages$()
        .pipe(
          filter(msg => msg.type === PopOutMessageType.STATE_UPDATE),
          takeUntil(this.destroy$)
        )
        .subscribe(message => {
          if (message.payload && message.payload.state) {
            this.resourceService.syncStateFromExternal(message.payload.state);
            this.cdr.markForCheck();
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle filter input changes
   *
   * @param field - Filter field ID
   * @param value - New value
   * @param debounce - Whether to debounce this change (default false)
   */
  onFilterChange(field: string, value: any, debounce = false): void {
    // Update local model immediately for UI responsiveness
    this.currentFilters[field] = value;

    if (debounce) {
      this.searchSubject.next({ field, value });
    } else {
      this.applyFilterChange(field, value);
    }
  }

  /**
   * Apply filter change to state management
   */
  private applyFilterChange(field: string, value: any): void {
    const isEmpty = value === null ||
                    value === undefined ||
                    value === '' ||
                    (Array.isArray(value) && value.length === 0);

    const paramValue = isEmpty ? null : value;

    // In pop-out: emit event for parent to handle
    if (this.popOutContext.isInPopOut()) {
      this.urlParamsChange.emit({
        [field]: paramValue,
        page: 1 // Reset to first page on filter change
      });
    } else {
      // In main window: update ResourceManagementService directly
      const newFilters: Record<string, any> = {
        ...this.currentFilters,
        page: 1
      };

      if (isEmpty) {
        newFilters[field] = undefined;
      } else {
        newFilters[field] = value;
      }

      this.resourceService.updateFilters(newFilters as unknown as TFilters);
    }
  }

  /**
   * Clear all filters
   *
   * In main window: Updates ResourceManagementService directly
   * In pop-out: Emits clearAllFilters event for parent to send to main window
   */
  clearFilters(): void {
    if (this.popOutContext.isInPopOut()) {
      this.clearAllFilters.emit();
    } else {
      this.resourceService.updateFilters({
        page: 1,
        size: this.currentFilters['size'] || 20
      } as unknown as TFilters);
    }
  }

  /**
   * Get options for a filter
   */
  getFilterOptions(filterId: string): FilterOption[] {
    if (this.dynamicOptions[filterId]) {
      return this.dynamicOptions[filterId];
    }
    const filterDef = this.domainConfig.filters.find(f => f.id === filterId);
    return filterDef?.options || [];
  }

  /**
   * Load dynamic options for filters with optionsEndpoint
   */
  private loadDynamicFilterOptions(): void {
    const filtersWithEndpoint = this.domainConfig.filters.filter(f => f.optionsEndpoint);

    filtersWithEndpoint.forEach(filterDef => {
      const endpoint = `${this.domainConfig.apiBaseUrl}/agg/${filterDef.optionsEndpoint}`;

      this.http.get<{ field: string; values: Array<{ value: string; count: number }> }>(endpoint)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.dynamicOptions[filterDef.id] = response.values.map(item => ({
              value: item.value,
              label: item.value
            }));
            this.cdr.markForCheck();
          },
          error: (err) => {
            console.error(`Failed to load options for ${filterDef.id}:`, err);
          }
        });
    });
  }

  /**
   * Handle autocomplete keyboard events
   * Allows Space key to select highlighted item (standard UX)
   *
   * @param event - Keyboard event
   * @param autocomplete - Reference to p-autoComplete component
   * @param filterId - Filter ID for updating the filter
   */
  onAutocompleteKeyUp(event: KeyboardEvent, autocomplete: any, filterId: string): void {
    if (event.key === ' ' || event.code === 'Space') {
      // Get the highlighted option from the autocomplete panel
      const highlightedOption = autocomplete.highlightOption;
      if (highlightedOption) {
        event.preventDefault();
        // Select the highlighted option
        autocomplete.selectItem(event, highlightedOption);
        this.onFilterChange(filterId, highlightedOption);
      }
    }
  }

  /**
   * Handle autocomplete blur event
   * Ensures the current text value is applied as a filter even if not selected from dropdown
   *
   * @param event - Blur event
   * @param filterId - Filter ID
   * @param autocomplete - Autocomplete component reference
   */
  handleAutocompleteBlur(event: any, filterId: string, autocomplete: any): void {
    // If there's input text but it differs from our current model (or model is empty), apply it
    // The input element's value is the raw text
    const inputValue = autocomplete.inputEL.nativeElement.value;

    if (inputValue && inputValue !== this.currentFilters[filterId]) {
      this.onFilterChange(filterId, inputValue);
    }
  }

  /**
   * Handle autocomplete focus - load initial suggestions
   * Shows first 10 options when user clicks/focuses the field
   *
   * @param filterDef - Filter definition with autocomplete endpoint
   */
  onAutocompleteFocus(filterDef: FilterDefinition): void {
    // Only load if we don't already have suggestions
    if (this.autocompleteSuggestions[filterDef.id]?.length > 0) {
      return;
    }
    // Load initial suggestions with empty query
    this.onAutocompleteSearch({ query: '' }, filterDef);
  }

  /**
   * Handle autocomplete search events
   * Fetches suggestions from the backend API based on user input
   *
   * @param event - PrimeNG autocomplete event with query string
   * @param filterDef - Filter definition with autocomplete endpoint
   */
  onAutocompleteSearch(event: { query: string }, filterDef: FilterDefinition): void {
    if (!filterDef.autocompleteEndpoint) {
      console.warn(`No autocompleteEndpoint defined for filter ${filterDef.id}`);
      return;
    }

    const query = event.query;
    const limit = 10; // Show top 10 matches
    const endpoint = `${this.domainConfig.apiBaseUrl}/${filterDef.autocompleteEndpoint}?search=${encodeURIComponent(query)}&limit=${limit}`;

    this.http.get<Record<string, string[]>>(endpoint)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Extract the array from the response (e.g., { models: [...] } or { manufacturers: [...] })
          const values = Object.values(response)[0] || [];
          this.autocompleteSuggestions[filterDef.id] = values;
          // Use detectChanges for OnPush - required for p-autoComplete panel to update
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(`Failed to fetch autocomplete suggestions for ${filterDef.id}:`, err);
          this.autocompleteSuggestions[filterDef.id] = [];
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Handle range slider change - updates both min and max URL params
   * Uses onSlideEnd to only trigger when user finishes dragging
   */
  onRangeSliderChange(filterDef: FilterDefinition, event: { values: number[] }): void {
    const values = event.values;
    if (!values || values.length !== 2) return;

    const [minVal, maxVal] = values;
    const minKey = filterDef.id + 'Min';
    const maxKey = filterDef.id + 'Max';

    // Update local model for UI
    this.currentFilters[minKey] = minVal;
    this.currentFilters[maxKey] = maxVal;

    // Apply via URL-First pattern
    if (this.popOutContext.isInPopOut()) {
      this.urlParamsChange.emit({
        [minKey]: minVal,
        [maxKey]: maxVal,
        page: 1
      });
    } else {
      const newFilters: Record<string, any> = {
        ...this.currentFilters,
        [minKey]: minVal,
        [maxKey]: maxVal,
        page: 1
      };
      this.resourceService.updateFilters(newFilters as unknown as TFilters);
    }
  }

  /**
   * Clear a range filter (both min and max)
   */
  clearRangeFilter(filterId: string): void {
    const minKey = filterId + 'Min';
    const maxKey = filterId + 'Max';

    this.currentFilters[minKey] = null;
    this.currentFilters[maxKey] = null;

    if (this.popOutContext.isInPopOut()) {
      this.urlParamsChange.emit({
        [minKey]: null,
        [maxKey]: null,
        page: 1
      });
    } else {
      const newFilters: Record<string, any> = {
        ...this.currentFilters,
        [minKey]: undefined,
        [maxKey]: undefined,
        page: 1
      };
      this.resourceService.updateFilters(newFilters as unknown as TFilters);
    }
  }
}
