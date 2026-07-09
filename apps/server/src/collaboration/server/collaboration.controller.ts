import { Controller, Get, UseGuards } from '@nestjs/common';
import { CollaborationGateway } from '../collaboration.gateway';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('collab')
export class CollaborationController {
  constructor(private readonly collaborationGateway: CollaborationGateway) {}

  @Get('stats')
  async getStats() {
    return {
      connections: this.collaborationGateway.getConnectionCount(),
      documents: this.collaborationGateway.getDocumentCount(),
    };
  }
}
