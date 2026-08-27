import { Controller, Get, Post, Put, Body, Param } from "@nestjs/common";
import { ProfileService } from "./profile.service";
import { Profile } from "./entities/profile.entity";

@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  findMe(@Body("userId") userId: string) {
    return this.profileService.findByUserId(userId);
  }

  @Post()
  create(@Body() profile: Partial<{ userId: string; phone?: string; location?: string; summary?: string }>) {
    return this.profileService.create(profile);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() changes: Partial<Profile>) {
    return this.profileService.update(id, changes);
  }
}
