import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { distinctUntilChanged, filter, map, Observable, startWith } from 'rxjs';
import { FooterComponent } from 'src/app/shared/components/footer/footer.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    RouterModule
  ]
})
export class AppComponent {

  title = 'fed-knowledge';
  
  // rotas onde o footer NÃO deve aparecer (escala fácil depois)
  private hideFooterOn = new Set<string>(['/']);

// boolean reativo, sem subscribe manual e sem destroy$
  public showFooter$: Observable<boolean> = this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    map(e => this.shouldShow(e.urlAfterRedirects)),
    startWith(this.shouldShow(this.router.url)),
    distinctUntilChanged()
  );

  constructor(private router: Router) {}

  private shouldShow(url: string): boolean {
    const path = url.split('?')[0].split('#')[0];  // normaliza
    return !this.hideFooterOn.has(path);
  }

}