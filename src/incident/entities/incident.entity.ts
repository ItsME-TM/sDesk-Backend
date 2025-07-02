import { Entity, Column } from 'typeorm';
import { Expose } from 'class-transformer';

export enum IncidentStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  HOLD = 'Hold',
  CLOSED = 'Closed',
}

export enum IncidentPriority {
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

@Entity()
export class Incident {
  @Column({ type: 'varchar', primary: true, unique: true })
  @Expose({ name: 'incident_number' })
  incident_number!: string;

  @Column('varchar')
  informant!: string;

  @Column()
  location!: string;

  @Column()
  handler!: string;

  @Column()
  update_by!: string;

  @Column()
  category!: string;

  @Column({ type: 'date' })
  update_on!: string;

  @Column({ type: 'enum', enum: IncidentStatus, default: IncidentStatus.OPEN })
  status!: IncidentStatus;

  @Column({
    type: 'enum',
    enum: IncidentPriority,
    default: IncidentPriority.MEDIUM,
  })
  priority!: IncidentPriority;

  @Column({ nullable: true })
  description!: string;

  @Column({ type: 'boolean', default: false })
  notify_informant!: boolean;

  @Column()
  urgent_notification_to!: string;

  @Column({ nullable: true })
  Attachment!: string;
}
