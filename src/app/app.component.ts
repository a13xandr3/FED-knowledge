import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { distinctUntilChanged, filter, map, Observable, startWith, Subject, takeUntil } from 'rxjs';
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
export class AppComponent implements OnInit, OnDestroy  {
  
  private destroy$ = new Subject<void>();
  
  currentRoute = '';

  title = 'fed-knowledge';
  
  constructor(
    private router: Router
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {
        this.currentRoute = event.urlAfterRedirects;
        //console.log('Rota atual:', this.currentRoute);
      });
  }

}