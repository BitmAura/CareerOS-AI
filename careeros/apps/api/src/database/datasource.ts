import { DataSource } from "typeorm";
import { User } from "../modules/users/entities/user.entity";

export default new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [User],
  migrations: ["src/database/migrations/*.ts"],
  synchronize: false,
});
