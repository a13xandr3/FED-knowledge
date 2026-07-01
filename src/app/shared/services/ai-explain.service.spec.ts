import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AiExplainRequest, AiExplainService } from './ai-explain.service';

describe('AiExplainService', () => {
  let service: AiExplainService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('kb_token', 'token-teste');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AiExplainService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('deve enviar request JSON e arquivo como multipart com autenticacao', () => {
    const request: AiExplainRequest = {
      mode: 'file',
      prompt: 'Explique',
      context: {
        tags: ['angular'],
        uris: []
      },
      attachment: {
        filename: 'a.txt',
        mimeType: 'text/plain',
        sizeBytes: 3
      }
    };
    const file = new File(['abc'], 'a.txt', { type: 'text/plain' });

    service.explain(request, file).subscribe(response => {
      expect(response).toEqual({ explanation: 'ok', model: 'gpt-test' });
    });

    const httpReq = httpMock.expectOne('http://localhost:8080/api/ai/explain');
    expect(httpReq.request.method).toBe('POST');
    expect(httpReq.request.headers.get('Authorization')).toBe('Bearer token-teste');
    expect(httpReq.request.body).toBeInstanceOf(FormData);

    const body = httpReq.request.body as FormData;
    expect(body.get('request')).toBeInstanceOf(Blob);
    const sentFile = body.get('file') as File;
    expect(sentFile).toBeInstanceOf(File);
    expect(sentFile.name).toBe(file.name);
    expect(sentFile.type).toBe(file.type);

    httpReq.flush({ explanation: 'ok', model: 'gpt-test' });
  });
});
