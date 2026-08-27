import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Profile } from "./profile.entity";

@Entity()
export class WorkExperience {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  profileId!: string;

  @Column()
  role!: string;

  @Column()
  company!: string;

  @Column()
  startDate!: string;

  @Column({ nullable: true })
  endDate?: string;

  @Column({ default: false })
  current!: boolean;

  @Column("text")
  description!: string;

  @ManyToOne(() => Profile, (profile) => profile.workExperience)
  @JoinColumn({ name: "profileId" })
  profile?: Profile;
}
