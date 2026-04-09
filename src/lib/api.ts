// ============================================================
// API CLIENT — Hiper del Pollo
// Todas las llamadas HTTP al backend van por acá
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://149.50.147.180/api';

// Token management
export const getToken = (): string | null => localStorage.getItem('hdp_token');
export const setToken = (token: string) => localStorage.setItem('hdp_token', token);
export const removeToken = () => localStorage.removeItem('hdp_token');

// HTTP client base
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Error en la solicitud');
  }

  return data;
}

const get = <T>(endpoint: string) => request<T>(endpoint);
const post = <T>(endpoint: string, body: unknown) =>
  request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
const put = <T>(endpoint: string, body: unknown) =>
  request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
const del = <T>(endpoint: string) =>
  request<T>(endpoint, { method: 'DELETE' });

// ============================================================
// AUTH
// ============================================================
export const authApi = {
  login: (email: string, password: string) =>
    post<{ success: boolean; data: { user: any; token: string } }>('/auth/login', { email, password }),

  register: (userData: any) =>
    post<{ success: boolean; data: { user: any; token: string } }>('/auth/register', userData),

  logout: () => post<{ success: boolean }>('/auth/logout', {}),

  recuperarPassword: (email: string) =>
    post<{ success: boolean; message: string }>('/auth/recuperar-password', { email }),

  verificarCodigo: (email: string, codigo: string) =>
    post<{ success: boolean }>('/auth/verificar-codigo', { email, codigo }),

  cambiarPassword: (email: string, codigo: string, nuevaPassword: string) =>
    post<{ success: boolean }>('/auth/cambiar-password', { email, codigo, nuevaPassword }),
};

// ============================================================
// USERS
// ============================================================
export const userApi = {
  getMe: () => get<{ success: boolean; data: any }>('/users/me'),

  updateMe: (data: Partial<any>) =>
    put<{ success: boolean; data: any }>('/users/me', data),
};

// ============================================================
// SORTEOS
// ============================================================
export const sorteoApi = {
  getAll: (params?: { estado?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.estado) q.set('estado', params.estado);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return get<{ success: boolean; data: any[] }>(`/sorteos?${q}`);
  },

  getById: (id: string) => get<{ success: boolean; data: any }>(`/sorteos/${id}`),

  create: (data: any) => post<{ success: boolean; data: any }>('/sorteos', data),

  update: (id: string, data: any) =>
    put<{ success: boolean; data: any }>(`/sorteos/${id}`, data),

  delete: (id: string) => del<{ success: boolean }>(`/sorteos/${id}`),

  getGanadores: (id: string) =>
    get<{ success: boolean; data: any[] }>(`/sorteos/${id}/ganadores`),

  getEstadisticas: (id: string) =>
    get<{ success: boolean; data: any }>(`/sorteos/${id}/estadisticas`),
};

// ============================================================
// PARTICIPACIONES
// ============================================================
export const participacionApi = {
  participar: (sorteoId: string) =>
    post<{ success: boolean; data: any }>('/participaciones', { sorteoId }),

  getMias: () => get<{ success: boolean; data: any[] }>('/participaciones/me'),
};

// ============================================================
// NOTIFICACIONES
// ============================================================
export const notificacionApi = {
  getMias: () => get<{ success: boolean; data: any[] }>('/notificaciones/me'),

  marcarLeida: (id: string) =>
    put<{ success: boolean }>(`/notificaciones/${id}/leer`, {}),
};

// ============================================================
// GANADORES
// ============================================================
export const ganadorApi = {
  getAll: () => get<{ success: boolean; data: any[] }>('/ganadores'),

  realizarSorteo: (sorteoId: string) =>
    post<{ success: boolean; data: any }>(`/sorteos/${sorteoId}/realizar`, {}),
};

// ============================================================
// PARTIDOS
// ============================================================
export const partidoApi = {
  getAll: (params?: { fase?: string; estado?: string }) => {
    const q = new URLSearchParams();
    if (params?.fase) q.set('fase', params.fase);
    if (params?.estado) q.set('estado', params.estado);
    q.set('limit', '100');
    return get<{ success: boolean; data: any[] }>(`/partidos?${q}`);
  },

  getById: (id: string) => get<{ success: boolean; data: any }>(`/partidos/${id}`),

  create: (data: any) => post<{ success: boolean; data: any }>('/partidos', data),

  update: (id: string, data: any) =>
    put<{ success: boolean; data: any }>(`/partidos/${id}`, data),

  delete: (id: string) => del<{ success: boolean }>(`/partidos/${id}`),

  getAcertadores: (id: string) =>
    get<{ success: boolean; data: any[] }>(`/partidos/${id}/acertadores`),

  confirmarAcertadores: (id: string, userIds: string[]) =>
    post<{ success: boolean }>(`/partidos/${id}/acertadores`, { userIds }),

  aplicarTripleChance: (id: string) =>
    post<{ success: boolean }>(`/partidos/${id}/triple-chance`, {}),
};

// ============================================================
// PREDICCIONES
// ============================================================
export const prediccionApi = {
  crear: (partidoId: string, golesLocal: number, golesVisitante: number) =>
    post<{ success: boolean; data: any }>('/predicciones', {
      partidoId,
      golesLocal,
      golesVisitante,
    }),

  getMias: () => get<{ success: boolean; data: any[] }>('/predicciones/me'),

  getMiPrediccionPartido: (partidoId: string) =>
    get<{ success: boolean; data: any }>(`/predicciones/partido/${partidoId}/me`),

  getEstadisticas: () =>
    get<{ success: boolean; data: any }>('/estadisticas/predicciones'),
};

// ============================================================
// CONFIG
// ============================================================
export const configApi = {
  getPrediccionesHabilitadas: () =>
    get<{ success: boolean; data: { valor: boolean } }>('/config/predicciones-habilitadas'),

  togglePredicciones: () =>
    put<{ success: boolean }>('/config/predicciones-habilitadas', {}),
};