import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import type { EmergencyData } from './interfaces/emergency.interface';
import { registerPayloadSchema, updatePositionPayloadSchema } from './interfaces/validation-schemas';
import { EmergencyService } from './emergency.service';

interface ConnectedDriver {
  readonly socketId: string;
  readonly driverId: string;
  lat: number;
  lng: number;
}

@WebSocketGateway({
  cors: { origin: process.env['WEBSOCKET_CORS_ORIGIN'] ?? '*' },
  namespace: '/emergency',
})
export class EmergencyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EmergencyGateway.name);
  private readonly drivers = new Map<string, ConnectedDriver>();
  private readonly socketToDriver = new Map<string, string>();

  constructor(
    @Inject(forwardRef(() => EmergencyService))
    private readonly emergencyService: EmergencyService,
  ) {}

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    this.logger.log({ msg: 'Client connected', socketId: client.id });
  }

  handleDisconnect(client: Socket): void {
    const driverId = this.socketToDriver.get(client.id);
    if (driverId) {
      this.drivers.delete(driverId);
      this.socketToDriver.delete(client.id);
      this.logger.log({ msg: 'Driver disconnected', driverId, socketId: client.id });
    }
  }

  @SubscribeMessage('register')
  async handleRegister(client: Socket, payload: unknown): Promise<void> {
    const parsed = registerPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn({ msg: 'Invalid register payload', errors: parsed.error.flatten(), socketId: client.id });
      return;
    }
    const { driverId, lat, lng } = parsed.data;
    const existing = this.drivers.get(driverId);
    if (existing && existing.socketId !== client.id) {
      this.socketToDriver.delete(existing.socketId);
    }
    this.drivers.set(driverId, { socketId: client.id, driverId, lat, lng });
    this.socketToDriver.set(client.id, driverId);
    this.logger.log({ msg: 'Driver registered', driverId, lat, lng, socketId: client.id });

    // If there is an active alert and this driver is in zone, send ALERT_ACTIVE so the app shows the popup
    // (covers real alerts when the app was in background and missed the initial push)
    const emergencyData: EmergencyData | null = await this.emergencyService.getEmergencyDataForLocation(lat, lng);
    if (emergencyData) {
      client.emit('ALERT_ACTIVE', emergencyData);
      this.logger.log({ msg: 'Sent current alert to driver on register', driverId });
    }
  }

  @SubscribeMessage('updatePosition')
  handleUpdatePosition(client: Socket, payload: unknown): void {
    const parsed = updatePositionPayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    const driverId = this.socketToDriver.get(client.id);
    if (!driverId) return;
    const driver = this.drivers.get(driverId);
    if (driver) {
      driver.lat = parsed.data.lat;
      driver.lng = parsed.data.lng;
    }
  }

  getConnectedDrivers(): ConnectedDriver[] {
    return Array.from(this.drivers.values());
  }

  emitToDriver(driverId: string, event: string, data: unknown): boolean {
    const driver = this.drivers.get(driverId);
    if (!driver) return false;
    this.server.to(driver.socketId).emit(event, data);
    return true;
  }

  broadcastClear(): void {
    this.server.emit('ALERT_CLEAR', { timestamp: new Date().toISOString() });
    this.logger.log({ msg: 'Broadcast ALERT_CLEAR to all connected', driverCount: this.drivers.size });
  }

  getConnectionCount(): number {
    return this.drivers.size;
  }
}
