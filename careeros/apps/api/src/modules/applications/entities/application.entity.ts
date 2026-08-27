import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Job } from "../../jobs/entities/job.entity";

@Entity()
export class Application {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column()
  jobId!: string;

  @Column({ nullable: true })
  resumeVersionId?: string;

  @Column("text", { nullable: true })
  coverLetter?: string;

  @Column({ default: "applied" })
  status!: string;

  @CreateDateColumn()
  appliedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column("text", { nullable: true })
  notes?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user?: User;

  @ManyToOne(() => Job)
  @JoinColumn({ name: "jobId" })
  job?: Job;
}
