import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SupabaseModule } from "./supabase.module";

@Module({
  imports: [
    ConfigModule,
    SupabaseModule,
  ],
  exports: [SupabaseModule],
})
export class ProvidersModule {}
