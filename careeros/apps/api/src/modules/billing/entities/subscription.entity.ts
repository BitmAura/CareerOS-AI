import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column({ default: "starter" })
  plan!: string;

  @Column({ default: "active" })
  status!: string;

  @Column()
  currentPeriodStart!: Date;

  @Column()
  currentPeriodEnd!: Date;

  @Column({ default: false })
  cancelAtPeriodEnd!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
