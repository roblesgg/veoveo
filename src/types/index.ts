/**
 * ARCHIVO: types/index.ts
 * DESCRIPCIÓN: Definiciones de tipos consolidadas para toda la aplicación.
 * Centraliza los modelos de datos de usuarios, chat, lógica de match y respuestas de TMDB.
 */

// --- MODELOS DE USUARIO Y PERFIL ---
export type UsuarioPerfil = {
  uid: string;                    // ID única del usuario en Firebase
  username: string;               // Nombre de pantalla
  username_servido?: string;      // Username en minúsculas para búsquedas eficientes
  email: string;                  // Correo electrónico
  fotoPerfil: string | null;      // URL de la imagen de perfil
  amigos: string[];               // Lista de UIDs de amigos
  fechaCreacion?: number;         // Timestamp de registro
  bloqueados?: string[];          // Lista de UIDs bloqueados
  estado?: 'online' | 'offline' | 'ausente'; // Estado de conexión en tiempo real
  ultimoAcceso?: number;          // Última vez que abrió la app
  pushToken?: string;             // Token de Expo para notificaciones push
  appVersion?: string;            // Última versión de app reportada por el cliente
  appVersionCode?: number;        // Último versionCode reportado por el cliente
  platform?: string;              // Plataforma del dispositivo
};

// --- MODELOS SOCIALES ---
export type SolicitudAmistad = {
  id: string;
  deUid: string;                  // Quién envía la solicitud
  paraUid: string;                // Quién debe recibirla
  deUsername: string;             // Username del emisor (para previsualización)
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  fecha: number;
};

// --- MODELOS DE CHAT Y MENSAJERÍA ---
export type ChatType = 'individual' | 'group';

export type Chat = {
  id: string;
  type: ChatType;
  participants: string[];         // UIDs de los participantes
  participantDetails?: { [uid: string]: Partial<UsuarioPerfil> }; // Caché de perfiles
  lastMessage?: {                 // Resumen del último mensaje para la lista de chats
    text: string;
    senderId: string;
    timestamp: number;
  };
  activeMatchId?: string | null;  // ID del juego de Movie Match activo en este chat
  createdAt: number;
  name?: string;                  // Nombre del grupo (si aplica)
  groupIcon?: string;             // Icono del grupo (si aplica)
};

export type MessageType = 'text' | 'movie' | 'match_invite' | 'match_result';

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: MessageType;
  timestamp: number;
  matchId?: string;               // ID del match asociado (si el mensaje es una invitación)
  movieData?: {                   // Datos de película embebida (si el mensaje es de tipo 'movie')
    id: number;
    title: string;
    posterPath: string;
  };
};

// --- MODELOS DE LÓGICA DE MATCH ---
export type MatchStatus = 'active' | 'finished' | 'cancelled';

export type MovieMatch = {
  id: string;
  chatId: string;
  creatorId: string;
  participants: string[];
  status: MatchStatus;
  settings: {
    targetMatches: number;        // Cuántas coincidencias detienen el juego
    excludeSeen: boolean;         // Ignorar películas ya vistas por los participantes
  };
  matchedMovies: number[];        // IDs de TMDB que han sido aceptadas por todos
  votes: { [movieId: number]: string[] };   // mapa peliId -> lista de UIDs que votaron SÍ
  noVotes: { [movieId: number]: string[] }; // mapa peliId -> lista de UIDs que votaron NO
  createdAt: number;
  finishedAt?: number;
};

// --- MODELOS DE PELÍCULAS DEL USUARIO (BIBLIOTECA) ---
export type PeliculaUsuario = {
  idPelicula: number;             // ID de TMDB
  titulo: string;
  rutaPoster: string | null;
  estado: 'por_ver' | 'vista';    // Watchlist o Biblioteca
  valoracion: number;             // Puntuación de 1 a 10
  fechaAnadido: number;
  fechaLanzamiento?: string;
  fechaVisto?: number;
  providers?: {                   // IDs de plataformas donde está disponible (cáche)
    flatrate: number[];
    rent: number[];
  };
};

// --- MODELOS DE TMDB API ---
export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string | null;
  vote_average: number;
  genre_ids?: number[];
  popularity?: number;
  providers?: {
    flatrate: number[];
    rent: number[];
  };
}

export type ActorMovie = Movie;

export interface MovieResponse {
  page: number;
  results: Movie[];
  total_pages: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface MovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  vote_average: number;
  vote_count: number;
  runtime: number | null;
  genres: Genre[];
  original_language: string;
  popularity: number;
  belongs_to_collection: any | null;
  videos?: {
    results: any[];
  };
}

export interface ActorDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
}

export interface ActorMovieCredits {
  id: number;
  cast: Movie[];
}

export interface CollectionDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: Movie[];
}

export interface WatchProvidersResponse {
  results: {
    [region: string]: {
      link: string;
      flatrate?: WatchProvider[];
      rent?: WatchProvider[];
      buy?: WatchProvider[];
    };
  };
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface CreditsResponse { 
  id: number; 
  cast: CastMember[]; 
  crew: CrewMember[]; 
}

export interface WatchProvider { 
  logo_path: string; 
  provider_id: number; 
  provider_name: string; 
  display_priority: number; 
}
