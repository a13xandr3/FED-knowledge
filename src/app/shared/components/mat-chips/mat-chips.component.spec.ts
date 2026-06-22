import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { firstValueFrom, skip } from 'rxjs';

import { MatChipsComponent } from './mat-chips.component';

describe('MatChipsComponent', () => {
  let component: MatChipsComponent;
  let fixture: ComponentFixture<MatChipsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatChipsComponent],
      providers: [provideNoopAnimations()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(MatChipsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve atualizar sugestoes quando allChips for definido', async () => {
    component.allChips = ['Angular', 'Jest'];

    const values = await firstValueFrom(component.filteredChips);

    expect(component.allChips).toEqual(['Angular', 'Jest']);
    expect(values).toEqual(['Angular', 'Jest']);

    component.allChips = undefined;
    expect(component.allChips).toEqual([]);
  });

  it('deve filtrar sugestoes digitadas', async () => {
    component.allChips = ['Angular', 'React', 'Jest'];
    const valuesPromise = firstValueFrom(component.filteredChips.pipe(skip(1)));

    component.chipCtrl.setValue('ang');
    const values = await valuesPromise;

    expect(values).toEqual(['Angular']);
  });

  it('writeValue deve normalizar valor recebido', () => {
    component.writeValue({ tags: ['a', 'b'] });

    expect(component.chips).toEqual(['a', 'b']);
  });

  it('deve registrar callbacks e atualizar estado disabled', () => {
    const onChange = jest.fn();
    const onTouched = jest.fn();

    component.registerOnChange(onChange);
    component.registerOnTouched(onTouched);
    component.setDisabledState(true);
    expect(component.chipCtrl.disabled).toBe(true);

    component.setDisabledState(false);
    expect(component.chipCtrl.disabled).toBe(false);

    component.addChip('novo');
    expect(onChange).toHaveBeenCalledWith(['novo']);
    expect(onTouched).toHaveBeenCalled();
  });

  it('addChip deve ignorar vazio ou duplicado e limpar input do evento', () => {
    const clear = jest.fn();
    component.chips = ['Angular'];

    component.addChip('Angular');
    component.addChip({ value: 'Angular', chipInput: { clear } } as any);
    component.addChip({ chipInput: { clear } } as any);
    component.addChip({ value: '   ', chipInput: { clear } } as any);

    expect(component.chips).toEqual(['Angular']);
    expect(clear).toHaveBeenCalledTimes(3);
    expect(component.chipCtrl.value).toBe('');
  });

  it('addChip deve adicionar chip novo, emitir sugestoes e limpar evento', () => {
    const clear = jest.fn();
    const chipsChangeSpy = jest.spyOn(component.allChipsChange, 'emit');
    component.allChips = ['Angular'];

    component.addChip({ value: 'Jest', chipInput: { clear } } as any);

    expect(component.chips).toEqual(['Jest']);
    expect(component.allChips).toEqual(['Angular', 'Jest']);
    expect(chipsChangeSpy).toHaveBeenCalledWith(['Jest']);
    expect(chipsChangeSpy).toHaveBeenCalledWith(['Angular', 'Jest']);
    expect(clear).toHaveBeenCalled();
  });

  it('addChip nao deve duplicar sugestao ja existente', () => {
    const chipsChangeSpy = jest.spyOn(component.allChipsChange, 'emit');
    component.allChips = ['Jest'];

    component.addChip('Jest');

    expect(component.chips).toEqual(['Jest']);
    expect(component.allChips).toEqual(['Jest']);
    expect(chipsChangeSpy).toHaveBeenCalledTimes(1);
    expect(chipsChangeSpy).toHaveBeenCalledWith(['Jest']);
  });

  it('removeTag deve remover chip existente e ignorar inexistente', () => {
    const emitSpy = jest.spyOn(component.allChipsChange, 'emit');
    component.chips = ['a', 'b'];

    component.removeTag('a');
    component.removeTag('x');

    expect(component.chips).toEqual(['b']);
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('chipSelected deve adicionar valor novo e limpar input', () => {
    const emitSpy = jest.spyOn(component.allChipsChange, 'emit');
    component.chipInput = { nativeElement: { value: 'Angular' } } as any;

    component.chipSelected({ option: { viewValue: 'Angular' } } as any);
    component.chipSelected({ option: { viewValue: 'Angular' } } as any);

    expect(component.chips).toEqual(['Angular']);
    expect(component.chipInput.nativeElement.value).toBe('');
    expect(component.chipCtrl.value).toBeNull();
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('ngOnChanges deve retornar no primeiro change sem efeitos colaterais', () => {
    expect(() => component.ngOnChanges({
      allChips: {
        firstChange: true,
        previousValue: undefined,
        currentValue: [],
        isFirstChange: () => true,
      },
    })).not.toThrow();

    expect(() => component.ngOnChanges({
      allChips: {
        firstChange: false,
        previousValue: [],
        currentValue: ['a'],
        isFirstChange: () => false,
      },
    })).not.toThrow();
  });
});
