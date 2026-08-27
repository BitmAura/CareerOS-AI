import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Job } from "../../jobs/entities/job.entity";

@Entity()
export class Interview {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  applicationId!: string;

  @Column()
  userId!: string;

  @Column()
  jobId!: string;

  @Column()
  type!: string;

  @Column()
  scheduledAt!: Date;

  @Column({ nullable: true })
  duration?: number;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  meetingLink?: string;

  @Column({ default: "scheduled" })
  status!: string;

  @Column("text", { nullable: true })
  feedback?: string;

  @Column({ nullable: true })
  rating?: number;

  @ManyToOne(() => User, (user) => user.id)
  user?: User;

  @ManyToOne(() => Job, (job) => job.id)
  job?: Job;

  @CreateDateColumn()
  createdAt!: Date;
}
