import { OnGatewayConnection } from '@nestjs/websockets';
import type { IncomingMessage } from 'node:http';
import { Server, WebSocket } from 'ws';
import { AuthService } from '../common/auth';
import { SpeechService } from '../application/speech.service';
export declare class VoiceGateway implements OnGatewayConnection {
    private readonly auth;
    private readonly speech;
    server: Server;
    constructor(auth: AuthService, speech: SpeechService);
    handleConnection(client: WebSocket, req: IncomingMessage): void;
}
