import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Resume {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column()
  fileName!: string;

  @Column()
  fileUrl!: string;

  @Column("float")
  fileSize!: number;

  @Column()
  mimeType!: string;

  @Column({ nullable: true })
  aiScore?: number;

  @Column({ nullable: true })
  parsedData?: string;

  @Column({ default: "uploaded" })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
