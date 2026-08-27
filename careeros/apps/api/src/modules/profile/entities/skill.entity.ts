import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Profile } from "./profile.entity";

@Entity()
export class Skill {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  profileId!: string;

  @Column()
  name!: string;

  @Column()
  category!: string;

  @Column({ default: "intermediate" })
  level!: string;

  @ManyToOne(() => Profile, (profile) => profile.skills)
  @JoinColumn({ name: "profileId" })
  profile?: Profile;
}
