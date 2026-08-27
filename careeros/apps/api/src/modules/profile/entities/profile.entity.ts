import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { WorkExperience } from "./work-experience.entity";
import { Education } from "./education.entity";
import { Skill } from "./skill.entity";

@Entity()
export class Profile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  summary?: string;

  @Column({ nullable: true })
  careerGoals?: string;

  @ManyToOne(() => User, (user) => user.profile)
  user?: User;

  @OneToMany(() => WorkExperience, (experience) => experience.profile)
  workExperience?: WorkExperience[];

  @OneToMany(() => Education, (education) => education.profile)
  education?: Education[];

  @OneToMany(() => Skill, (skill) => skill.profile)
  skills?: Skill[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
