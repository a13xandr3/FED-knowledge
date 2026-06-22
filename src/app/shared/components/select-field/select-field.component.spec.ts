import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { SelectFieldComponent } from './select-field.component';

describe('SelectFieldComponent', () => {
  let component: SelectFieldComponent;
  let fixture: ComponentFixture<SelectFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectFieldComponent],
      providers: [provideNoopAnimations()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve sincronizar input value com FormControl', () => {
    fixture.componentRef.setInput('value', 'a');
    fixture.detectChanges();

    expect(component.selected.value).toBe('a');
  });

  it('deve emitir opcao encontrada na selecao', () => {
    const emitSpy = jest.spyOn(component.valueChange, 'emit');
    fixture.componentRef.setInput('options', [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);
    fixture.detectChanges();

    component.onSelectionChange({ value: 'b' } as any);

    expect(emitSpy).toHaveBeenCalledWith({ value: 'b', label: 'B' });
  });

  it('deve emitir null quando selecao nao existir e ao limpar', () => {
    const emitSpy = jest.spyOn(component.valueChange, 'emit');

    component.onSelectionChange({ value: 'x' } as any);
    component.clear();

    expect(emitSpy).toHaveBeenCalledWith(null);
    expect(component.selected.value).toBeNull();
  });
});
