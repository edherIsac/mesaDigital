import { IsEnum } from 'class-validator';
import { SessionStatus } from '../schemas/session.schema';

export class UpdateSessionStatusDto {
  @IsEnum(SessionStatus)
  status: SessionStatus;
}
