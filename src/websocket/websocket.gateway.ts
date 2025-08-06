import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit } from '@nestjs/common';

@WebSocketGateway({ cors: true })
export class WebsocketGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  onModuleInit() {
    this.server.on('connection', (socket) => {
    });
  }

  @SubscribeMessage('user_connected')
  handleUserConnected(
    @MessageBody() data: { serviceNum: string; role: string; name: string },
    @ConnectedSocket() client: Socket,
  ) {
  }

  public emitTechnicianStatusChange(serviceNum: string, active: boolean) {
    this.server.emit('technician_status_changed', { serviceNum, active });
  }
}
