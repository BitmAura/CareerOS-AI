import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as dotenv from "dotenv";
import * as path from "path";
import { join } from "path";
import { AppModule } from "./app.module";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.enableCors({
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      credentials: true,
    });
    app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads" });
    app.setGlobalPrefix(process.env.API_PREFIX || "api");
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    const port = parseInt(process.env.PORT || "3001", 10);
    await app.listen(port);
    logger.log(`API running on http://localhost:${port}/${process.env.API_PREFIX || "api"}`);
  } catch (error) {
    logger.error("Failed to start API", error);
    process.exit(1);
  }
}
bootstrap();
