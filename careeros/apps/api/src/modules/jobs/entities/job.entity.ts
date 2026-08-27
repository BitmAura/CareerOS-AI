import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Job {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column()
  company!: string;

  @Column()
  location!: string;

  @Column({ nullable: true })
  salary?: string;

  @Column("text")
  description!: string;

  @Column({ default: "[]" })
  requirements!: string;

  @Column()
  source!: string;

  @Column({ nullable: true })
  sourceUrl?: string;

  @Column({ nullable: true })
  externalId?: string;

  @Column({ nullable: true })
  matchScore?: number;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
