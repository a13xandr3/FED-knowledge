import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';

export type AiExplainMode = 'topic' | 'image' | 'file';

export interface AiExplainContext {
  id?: number;
  name?: string;
  categoria?: string;
  subCategoria?: string;
  tags: string[];
  uris: string[];
  descricao?: string;
}

export interface AiExplainAttachment {
  filename: string;
  mimeType?: string;
  sizeBytes: number;
}

export interface AiExplainRequest {
  mode: AiExplainMode;
  prompt: string;
  context: AiExplainContext;
  attachment?: AiExplainAttachment;
}

export interface AiExplainResponse {
  explanation: string;
  model?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiExplainService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.bffUrl}/api/ai/explain`;

  explain(request: AiExplainRequest, file?: File): Observable<AiExplainResponse> {
    const formData = new FormData();
    formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));

    if (file) {
      formData.append('file', file, file.name);
    }

    return this.http.post<AiExplainResponse>(this.endpoint, formData, {
      headers: this.authHeaders()
    });
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('kb_token') || localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
