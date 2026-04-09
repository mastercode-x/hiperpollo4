import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AppState, User, Sorteo, Participacion, Notificacion,
  Ganador, RegisterData, Partido, Prediccion,
} from '@/types';
import {
  authApi, userApi, sorteoApi, participacionApi,
  notificacionApi, ganadorApi, partidoApi, prediccionApi,
  configApi, getToken, setToken, removeToken,
} from '@/lib/api';

const mapSorteo = (s: any): Sorteo => ({
  id: s.id, titulo: s.titulo, descripcion: s.descripcion,
  imagen: s.imagen || '', fechaInicio: s.fechaInicio, fechaFin: s.fechaFin,
  fechaSorteo: s.fechaSorteo, premios: s.premios || [], estado: s.estado,
  participantes: s._count?.participaciones ?? s.participantes ?? 0,
  maxParticipantes: s.maxParticipantes, requisitos: s.requisitos || [],
  edadMinima: s.edadMinima || 18, edadMaxima: s.edadMaxima,
  requisitosPersonalizados: s.requisitosPersonalizados || [],
  terminosCondiciones: s.terminosCondiciones || '',
  creadoPor: s.creadoPor, fechaCreacion: s.fechaCreacion,
  tipoSorteo: s.tipoSorteo, cantidadGanadores: s.cantidadGanadores,
});

const mapPartido = (p: any): Partido => ({
  id: p.id,
  equipoLocal: { id: p.equipoLocal?.id || '', nombre: p.equipoLocal?.nombre || '',
    codigo: p.equipoLocal?.codigoFIFA || '', bandera: p.equipoLocal?.bandera || '', grupo: p.equipoLocal?.grupo || '' },
  equipoVisitante: { id: p.equipoVisitante?.id || '', nombre: p.equipoVisitante?.nombre || '',
    codigo: p.equipoVisitante?.codigoFIFA || '', bandera: p.equipoVisitante?.bandera || '', grupo: p.equipoVisitante?.grupo || '' },
  fecha: p.fecha, hora: p.hora, estadio: p.estadio, ciudad: p.ciudad,
  fase: p.fase === 'faseGrupos' ? 'fase-grupos' : p.fase === 'tercerPuesto' ? 'tercer-puesto' : p.fase,
  grupo: p.grupo, jornada: p.jornada,
  estado: p.estado === 'enVivo' ? 'en-vivo' : p.estado,
  golesLocal: p.golesLocal, golesVisitante: p.golesVisitante,
  imagen: p.imagen, video: p.video, descripcion: p.descripcion,
  sorteoId: p.sorteoId, creadoPor: p.creadoPor, fechaCreacion: p.fechaCreacion,
});

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null, isAuthenticated: false, esAdmin: false,

      login: async (email: string, password: string) => {
        try {
          const res = await authApi.login(email, password);
          if (res.success && res.data) {
            setToken(res.data.token);
            set({ user: res.data.user, isAuthenticated: true, esAdmin: res.data.user.esAdmin });
            await get().cargarSorteos();
            await get().cargarPartidos();
            return true;
          }
          return false;
        } catch { return false; }
      },

      register: async (userData: RegisterData) => {
        try {
          const res = await authApi.register(userData);
          if (res.success && res.data) {
            setToken(res.data.token);
            set({ user: res.data.user, isAuthenticated: true, esAdmin: false });
            await get().cargarSorteos();
            await get().cargarPartidos();
            return true;
          }
          return false;
        } catch { return false; }
      },

      logout: () => {
        removeToken();
        set({ user: null, isAuthenticated: false, esAdmin: false,
          sorteos: [], participaciones: [], notificaciones: [],
          ganadores: [], partidos: [], predicciones: [],
          sorteoActivo: null, partidoActivo: null });
      },

      sorteos: [], sorteoActivo: null,

      cargarSorteos: async () => {
        try {
          const res = await sorteoApi.getAll({ limit: 100 });
          const data = Array.isArray(res.data) ? res.data : (res as any).data?.sorteos || [];
          set({ sorteos: data.map(mapSorteo) });
        } catch {}
      },

      seleccionarSorteo: (sorteo) => set({ sorteoActivo: sorteo }),

      crearSorteo: (sorteoData) => {
        sorteoApi.create(sorteoData).then(res => { if (res.success) get().cargarSorteos(); });
        return { ...sorteoData, id: `temp-${Date.now()}`, creadoPor: get().user?.email || '', fechaCreacion: new Date().toISOString(), participantes: 0 } as Sorteo;
      },

      actualizarSorteo: (sorteoId, sorteoData) => {
        sorteoApi.update(sorteoId, sorteoData).then(() => get().cargarSorteos());
        return true;
      },

      eliminarSorteo: (sorteoId) => {
        sorteoApi.delete(sorteoId).then(() => set(s => ({ sorteos: s.sorteos.filter(x => x.id !== sorteoId) })));
        return true;
      },

      participaciones: [],

      participarEnSorteo: async (sorteoId) => {
        try {
          const res = await participacionApi.participar(sorteoId);
          if (res.success) {
            const p = res.data;
            set(s => ({
              participaciones: [...s.participaciones, { id: p.id, userId: p.userId, sorteoId: p.sorteoId,
                fechaParticipacion: p.fechaParticipacion, numeroTicket: p.numeroTicket,
                estado: p.estado, chances: p.chances || 1, esAcertador: false }],
              sorteos: s.sorteos.map(x => x.id === sorteoId ? { ...x, participantes: x.participantes + 1 } : x),
            }));
            return true;
          }
          return false;
        } catch { return false; }
      },

      verificarParticipacion: (sorteoId) => {
        const { user, participaciones } = get();
        if (!user) return false;
        return participaciones.some(p => p.sorteoId === sorteoId && p.userId === user.id);
      },

      notificaciones: [],

      marcarNotificacionLeida: async (id) => {
        try {
          await notificacionApi.marcarLeida(id);
          set(s => ({ notificaciones: s.notificaciones.map(n => n.id === id ? { ...n, leida: true } : n) }));
        } catch {}
      },

      ganadores: [],

      realizarSorteo: (sorteoId) => {
        ganadorApi.realizarSorteo(sorteoId).then(() => get().cargarSorteos());
        return [];
      },

      obtenerGanadoresPorSorteo: (sorteoId) => get().ganadores.filter(g => g.sorteoId === sorteoId),

      obtenerEstadisticasSorteo: () => ({
        totalParticipantes: 0, participantesUnicos: 0, tasaConversion: 0,
        participacionesPorDia: [], comparacionSorteosAnteriores: 0,
      }),

      obtenerEstadisticasGenerales: () => {
        const { sorteos, participaciones } = get();
        return {
          totalSorteos: sorteos.length,
          sorteosActivos: sorteos.filter(s => s.estado === 'activo').length,
          sorteosFinalizados: sorteos.filter(s => s.estado === 'finalizado').length,
          totalParticipaciones: participaciones.length,
          totalParticipantesUnicos: new Set(participaciones.map(p => p.userId)).size,
          promedioParticipacionesPorSorteo: sorteos.length > 0 ? Math.round(participaciones.length / sorteos.length) : 0,
          sorteosConMayorParticipacion: [],
        };
      },

      enviarNotificacionGanador: () => {},

      partidos: [], partidoActivo: null,

      cargarPartidos: async () => {
        try {
          const res = await partidoApi.getAll({ limit: 100 } as any);
          const data = Array.isArray(res.data) ? res.data : (res as any).data?.partidos || [];
          set({ partidos: data.map(mapPartido) });
        } catch {}
      },

      seleccionarPartido: (partido) => set({ partidoActivo: partido }),

      crearPartido: (partidoData) => {
        const faseMap: Record<string, string> = { 'fase-grupos': 'faseGrupos', 'tercer-puesto': 'tercerPuesto' };
        const body = {
          ...partidoData,
          equipoLocalId: (partidoData.equipoLocal as any)?.id,
          equipoVisitanteId: (partidoData.equipoVisitante as any)?.id,
          fase: faseMap[partidoData.fase] || partidoData.fase,
          estado: partidoData.estado === 'en-vivo' ? 'enVivo' : partidoData.estado,
        };
        partidoApi.create(body).then(() => get().cargarPartidos());
        return { ...partidoData, id: `temp-${Date.now()}`, creadoPor: '', fechaCreacion: new Date().toISOString() } as Partido;
      },

      actualizarPartido: (partidoId, partidoData) => {
        const faseMap: Record<string, string> = { 'fase-grupos': 'faseGrupos', 'tercer-puesto': 'tercerPuesto' };
        const body: any = { ...partidoData };
        if (partidoData.fase) body.fase = faseMap[partidoData.fase] || partidoData.fase;
        if (partidoData.estado === 'en-vivo') body.estado = 'enVivo';
        partidoApi.update(partidoId, body).then(() => get().cargarPartidos());
        return true;
      },

      eliminarPartido: (partidoId) => {
        partidoApi.delete(partidoId).then(() => set(s => ({ partidos: s.partidos.filter(p => p.id !== partidoId) })));
        return true;
      },

      predicciones: [],

      realizarPrediccion: async (partidoId, sorteoId, golesLocal, golesVisitante) => {
        try {
          const res = await prediccionApi.crear(partidoId, golesLocal, golesVisitante);
          if (res.success && res.data) {
            const pred: Prediccion = { id: res.data.id, userId: res.data.userId,
              partidoId: res.data.partidoId, sorteoId: res.data.sorteoId || sorteoId,
              golesLocal: res.data.golesLocal, golesVisitante: res.data.golesVisitante,
              fechaPrediccion: res.data.fechaPrediccion, estado: res.data.estado,
              tripleChanceAplicado: res.data.tripleChanceAplicado };
            set(s => ({ predicciones: [...s.predicciones, pred] }));
            return pred;
          }
          return null;
        } catch { return null; }
      },

      verificarPrediccion: (partidoId) => {
        const { user, predicciones } = get();
        if (!user) return undefined;
        return predicciones.find(p => p.partidoId === partidoId && p.userId === user.id);
      },

      obtenerPrediccionesPorPartido: (partidoId) => get().predicciones.filter(p => p.partidoId === partidoId),

      seleccionarAcertadores: (partidoId, userIds) => { partidoApi.confirmarAcertadores(partidoId, userIds); },

      aplicarTripleChance: (partidoId) => { partidoApi.aplicarTripleChance(partidoId).then(() => get().cargarPartidos()); },

      obtenerAcertadoresPorPartido: () => [],

      obtenerEstadisticasPredicciones: () => ({
        totalPredicciones: get().predicciones.length,
        totalAcertadores: get().predicciones.filter(p => p.estado === 'acertado').length,
        porcentajeAcierto: 0, prediccionesPorPartido: [], usuariosConTripleChance: 0,
      }),

      solicitarRecuperacion: async (email) => {
        try { await authApi.recuperarPassword(email); return { success: true }; }
        catch { return { success: false }; }
      },

      verificarCodigo: async (email, codigo) => {
        try { const res = await authApi.verificarCodigo(email, codigo); return res.success; }
        catch { return false; }
      },

      cambiarPassword: async (email, newPassword) => {
        try { const res = await authApi.cambiarPassword(email, '', newPassword); return res.success; }
        catch { return false; }
      },

      actualizarPerfil: async (data) => {
        try {
          const res = await userApi.updateMe(data);
          if (res.success) { set(s => ({ user: s.user ? { ...s.user, ...data } : null })); return true; }
          return false;
        } catch { return false; }
      },

      prediccionesHabilitadas: true,

      togglePredicciones: () => {
        configApi.togglePredicciones();
        set(s => ({ prediccionesHabilitadas: !s.prediccionesHabilitadas }));
      },
    }),
    {
      name: 'hiperdelpollo-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user, isAuthenticated: state.isAuthenticated,
        esAdmin: state.esAdmin, prediccionesHabilitadas: state.prediccionesHabilitadas,
      }),
    }
  )
);

// Auto-cargar datos al iniciar si hay sesión activa
const token = getToken();
if (token) {
  const store = useStore.getState();
  if (store.isAuthenticated) {
    store.cargarSorteos();
    store.cargarPartidos();
    participacionApi.getMias().then(res => {
      const data = Array.isArray(res.data) ? res.data : (res as any).data?.participaciones || [];
      useStore.setState({ participaciones: data });
    }).catch(() => {});
    notificacionApi.getMias().then(res => {
      const data = Array.isArray(res.data) ? res.data : (res as any).data?.notificaciones || [];
      useStore.setState({ notificaciones: data });
    }).catch(() => {});
    prediccionApi.getMias().then(res => {
      const data = Array.isArray(res.data) ? res.data : (res as any).data?.predicciones || [];
      useStore.setState({ predicciones: data });
    }).catch(() => {});
  }
}


