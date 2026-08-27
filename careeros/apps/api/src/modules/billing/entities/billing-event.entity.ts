import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class BillingEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column({ nullable: true })
  subscriptionId?: string;

  @Column("float")
  amount!: number;

  @Column()
  currency!: string;

  @Column({ default: "pending" })
  status!: string;

  @Column()
  provider!: string;

  @Column({ nullable: true })
  providerEventId?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
