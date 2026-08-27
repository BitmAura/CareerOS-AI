import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column()
  title!: string;

  @Column("text")
  message!: string;

  @Column()
  type!: string;

  @Column({ default: false })
  read!: boolean;

  @Column({ nullable: true })
  data?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
