// src/app/app.module.ts
// VERSION 3 (Phase 3+) - Full framework integration

import { NgModule, ErrorHandler, Injector } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PrimengModule } from './primeng.module';
import { FrameworkModule, GlobalErrorHandler, HttpErrorInterceptor } from './lib/framework';
import { DOMAIN_CONFIG, ENVIRONMENT_CONFIG } from './lib/config';
import { PopoutModule } from './lib/popout';
import { createAutomobileDomainConfig } from './domain-config/automobile';
import { environment } from '../environments/environment';

// Feature Components
import { HomeComponent } from './features/home/home.component';
import { DiscoverComponent } from './features/discover/discover.component';
import { AutomobileComponent } from './features/automobile/automobile.component';

/**
 * Root Application Module (AppModule)
 *
 * Central configuration and bootstrapping module for the vvroom Angular application.
 * Aggregates all feature components, framework services, and third-party library modules.
 *
 * @class AppModule
 * @see AppComponent - Root component
 * @see FrameworkModule - Core framework services and components
 * @see PrimengModule - UI component library configuration
 * @see GlobalErrorHandler - Global error handling service
 */
@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DiscoverComponent,
    AutomobileComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    DragDropModule,
    AppRoutingModule,
    PrimengModule,
    FrameworkModule,
    PopoutModule
  ],
  providers: [
    MessageService,
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpErrorInterceptor,
      multi: true
    },
    {
      provide: DOMAIN_CONFIG,
      useFactory: createAutomobileDomainConfig,
      deps: [Injector]
    },
    {
      provide: ENVIRONMENT_CONFIG,
      useValue: environment
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
