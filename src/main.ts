import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom, enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { MatSnackBarModule } from '@angular/material/snack-bar';

import Quill from 'quill';

import { AppComponent } from 'src/app/app.component';
import { routes } from 'src/app/app.routes';
import { environment } from 'src/environments/environment';
import { tokenInterceptor } from 'src/app/shared/services/token.interceptor.service';

if (environment.production) enableProdMode();

// --- registrar FontAttributor (classes ql-font-*)
const FontAttributor = Quill.import('attributors/class/font');
FontAttributor.whitelist = ['Alumni', 'Poppins', 'Raleway'];
Quill.register(FontAttributor, true);

// --- registrar SizeAttributor (style size - ex.: '72px')
const SizeStyle = Quill.import('attributors/style/size');
SizeStyle.whitelist = ['8px','10px','12px','14px','16px','18px','20px','36px','72px'];
Quill.register(SizeStyle, true);

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideAnimations(),          // substitui BrowserAnimationsModule
    provideHttpClient(
      withInterceptors([tokenInterceptor])
    ),
    importProvidersFrom(MatSnackBarModule), // MatSnackBar p/ SnackService
  ],
}).catch(err => console.error(err));