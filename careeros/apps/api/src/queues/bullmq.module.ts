import { BullModule } from "@nestjs/bullmq";
import { DynamicModule, Module } from "@nestjs/common";

@Module({})
export class BullMQModule {
  static forRoot(): DynamicModule {
    const enabled = process.env.ENABLE_QUEUES === "true";

    if (!enabled) {
      return {
        module: BullMQModule,
        providers: [],
        exports: [],
      };
    }

    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    let host = "localhost";
    let port = 6379;

    try {
      const parsed = new URL(redisUrl);
      host = parsed.hostname || "localhost";
      port = parsed.port ? parseInt(parsed.port, 10) : 6379;
    } catch {
      // keep defaults
    }

    return {
      module: BullMQModule,
      imports: [
        BullModule.forRoot({
          connection: { host, port },
          prefix: process.env.BULLMQ_PREFIX || "careeros",
        }),
        BullModule.registerQueue(
          { name: "resume" },
          { name: "parsing" },
          { name: "matching" },
          { name: "ai" },
          { name: "notification" },
          { name: "application" },
        ),
      ],
      exports: [BullModule],
    };
  }
}
