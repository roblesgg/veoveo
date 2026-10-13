import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Perfil: undefined;
  Ajustes: undefined;
  Bloqueados: undefined;
  Solicitudes: undefined;
  BibliotecaAmigo: { amigoUid: string };
  Actor: { actorId: number; actorName: string };
  Pelicula: { movieId: number };
  Verification: undefined;
  ChatDetail: {
    chatId: string;
    chatName?: string;
    participants: string[];
    activeMatchId?: string | null;
  };
  MovieMatch: { matchId: string };
  MatchConfig: { chatId: string; participants: string[] };
};

export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;
