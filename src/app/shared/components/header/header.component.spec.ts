import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';

import { HeaderComponent } from './header.component';
import { HomeService } from 'src/app/shared/services/home.service';
import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { SnackService } from 'src/app/shared/services/snack.service';
import { DialogContentComponent } from 'src/app/shared/components/dialog-content/dialog-content.component';
import { FiltroSelecionado } from 'src/app/shared/components/app-filtro/app-filtro.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let refreshSubject: Subject<boolean>;
  let homeService: { getCategorias: jest.Mock; getTags: jest.Mock };
  let linkStateService: { refreshLink$: Subject<boolean>; triggerRefresh: jest.Mock };
  let dialog: { open: jest.Mock };

  beforeEach(async () => {
    refreshSubject = new Subject<boolean>();
    homeService = {
      getCategorias: jest.fn().mockReturnValue(of(['TI'])),
      getTags: jest.fn().mockReturnValue(of(['angular'])),
    };
    linkStateService = {
      refreshLink$: refreshSubject,
      triggerRefresh: jest.fn(),
    };
    dialog = {
      open: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent, NoopAnimationsModule],
      providers: [
        { provide: HomeService, useValue: homeService },
        { provide: LinkStateService, useValue: linkStateService },
        { provide: MatDialog, useValue: dialog },
        { provide: SnackService, useValue: { mostrarMensagem: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar categorias e tags ao iniciar', () => {
    fixture.detectChanges();

    expect(homeService.getCategorias).toHaveBeenCalledTimes(1);
    expect(homeService.getTags).toHaveBeenCalledTimes(1);
  });

  it('deve emitir categoria e tag selecionadas', () => {
    const emitSpy = jest.spyOn(component.itemSelecionadoEvent, 'emit');

    component.onFiltroSelecionado({ tipo: 'categoria', valor: 'TI' } satisfies FiltroSelecionado);
    component.onFiltroSelecionado({ tipo: 'tag', valor: 'angular' } satisfies FiltroSelecionado);

    expect(emitSpy).toHaveBeenCalledWith('TI_categoria');
    expect(emitSpy).toHaveBeenCalledWith('angular_tag');
  });

  it('deve abrir o dialog e disparar refresh quando houver categoria no resultado', () => {
    const dialogRef = {
      afterClosed: jest.fn().mockReturnValue(of({ categoria: 'Nova Categoria' })),
    } as unknown as MatDialogRef<DialogContentComponent>;
    dialog.open.mockReturnValue(dialogRef);
    linkStateService.triggerRefresh.mockClear();

    component.abrirDialog();

    expect(dialog.open).toHaveBeenCalled();
    expect(linkStateService.triggerRefresh).toHaveBeenCalled();
  });

  it('deve recarregar opções quando refreshLink$ emitir', () => {
    fixture.detectChanges();
    refreshSubject.next(true);

    expect(homeService.getCategorias).toHaveBeenCalledTimes(2);
    expect(homeService.getTags).toHaveBeenCalledTimes(2);
  });
});
