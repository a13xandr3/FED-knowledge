
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { FooterComponent } from 'src/app/shared/components/footer/footer.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [
        FooterComponent,
        RouterModule
    ]
})
export class AppComponent implements OnInit, OnDestroy  {
  
  private destroy$ = new Subject<void>();
  
  currentRoute = '';

  title = 'fed-knowledge';
  
  constructor(
    private readonly router: Router
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        this.currentRoute = event.urlAfterRedirects;
      });
  }

}
