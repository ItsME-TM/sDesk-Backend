import { Entity, Column, PrimaryGeneratedColumn,OneToOne,JoinColumn } from 'typeorm';
import { SLTUser } from '../../sltusers/entities/sltuser.entity'; 

@Entity('technicians') 

export class Technician {
  @PrimaryGeneratedColumn('uuid')
  id: number;


 @OneToOne(()=> SLTUser)
 @JoinColumn()//// this creates the userId foreign key in Technician table
 user: SLTUser;


 @Column({nullable: false})
serviceNum: string;


  @Column({ nullable: false})
  name: string;

  @Column()
  team: string;

  @Column()
  cat1: string;

  @Column()
  cat2: string;

  @Column()
  cat3: string;

  @Column()
  cat4: string;

  @Column()
  rr: number;

  @Column()
  active: boolean;
  @Column()
  tier: number;

  @Column()
  level: string;

  @Column()
  teamLevel: string;

  @Column()
  designation: string;

  @Column({unique: true }) 
  email: string;

  @Column({})
  contactNumber: string;

  @Column({ nullable: true })
  teamLeader?: boolean;

  @Column({ nullable: true })
  assignAfterSignOff?: boolean;

  @Column({ nullable: true })
  permanentMember?: boolean;

  @Column({ nullable: true })
  subrootUser?: boolean;

}