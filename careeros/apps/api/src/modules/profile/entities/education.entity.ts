import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Profile } from "./profile.entity";

@Entity()
export class Education {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  profileId!: string;

  @Column()
  degree!: string;

  @Column()
  institution!: string;

  @Column()
  year!: string;

  @Column({ nullable: true })
  score?: string;

  @ManyToOne(() => Profile, (profile) => profile.education)
  @JoinColumn({ name: "profileId" })
  profile?: Profile;
}
