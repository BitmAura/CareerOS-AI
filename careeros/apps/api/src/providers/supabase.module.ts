import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { SupabaseClient } from "@supabase/supabase-js";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: "SUPABASE_CLIENT",
      useFactory: (config: ConfigService): SupabaseClient => {
        const url = config.get<string>("SUPABASE_URL");
        const key = config.get<string>("SUPABASE_ANON_KEY");
        if (!url || !key || url.includes("your-project")) {
          console.warn("Supabase not configured - using mock client");
          return createClient("https://placeholder.supabase.co", "placeholder-key");
        }
        return createClient(url, key);
      },
      inject: [ConfigService],
    },
  ],
  exports: ["SUPABASE_CLIENT"],
})
export class SupabaseModule {}
